/**
 * Multi-Source Medical Research Retriever
 * Fetches from PubMed, OpenAlex, and ClinicalTrials.gov
 */

import axios from 'axios';
import xml2js from 'xml2js';
import {
  RETRIEVAL_SOURCES,
  HTTP_TIMEOUT,
  RETRIEVAL_LIMITS,
} from '../config/constants.js';
import logger from '../utils/logger.js';

const BASE_URLS = RETRIEVAL_SOURCES;
const httpClient = axios.create({ timeout: HTTP_TIMEOUT });

// PubMed

export async function fetchPubMed(
  query,
  disease,
  maxResults = RETRIEVAL_LIMITS.pubmedMaxResults,
) {
  try {
    // Step 1: search for IDs
    const searchRes = await httpClient.get(BASE_URLS.pubmed_search, {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        sort: 'pub date',
        retmode: 'json',
      },
    });

    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2: fetch details in batches
    const batches = [];
    for (
      let i = 0;
      i < Math.min(ids.length, RETRIEVAL_LIMITS.pubmedMaxFetch);
      i += RETRIEVAL_LIMITS.pubmedBatchSize
    ) {
      batches.push(ids.slice(i, i + RETRIEVAL_LIMITS.pubmedBatchSize));
    }

    const allArticles = [];
    for (const batch of batches) {
      try {
        const fetchRes = await httpClient.get(BASE_URLS.pubmed_fetch, {
          params: {
            db: 'pubmed',
            id: batch.join(','),
            retmode: 'xml',
          },
        });

        const parsed = await xml2js.parseStringPromise(fetchRes.data, {
          explicitArray: false,
        });
        const articles = parsed?.PubmedArticleSet?.PubmedArticle;
        if (!articles) continue;

        const arr = Array.isArray(articles) ? articles : [articles];
        for (const art of arr) {
          try {
            const medline = art.MedlineCitation;
            const article = medline?.Article;
            const pmid = medline?.PMID?._ || medline?.PMID;

            // Authors
            let authors = [];
            const authorList = article?.AuthorList?.Author;
            if (authorList) {
              const arr2 = Array.isArray(authorList)
                ? authorList
                : [authorList];
              authors = arr2
                .slice(0, 5)
                .map((a) => {
                  const last = a.LastName || '';
                  const fore = a.ForeName || a.Initials || '';
                  return `${last} ${fore}`.trim();
                })
                .filter(Boolean);
            }

            // Abstract
            let abstract = '';
            const abs = article?.Abstract?.AbstractText;
            if (typeof abs === 'string') abstract = abs;
            else if (Array.isArray(abs))
              abstract = abs
                .map((a) => (typeof a === 'string' ? a : a._))
                .join(' ');
            else if (abs?._) abstract = abs._;

            // Year
            const pubDate = article?.Journal?.JournalIssue?.PubDate;
            const year =
              pubDate?.Year || pubDate?.MedlineDate?.slice(0, 4) || 'N/A';

            // Journal
            const journal =
              article?.Journal?.Title ||
              article?.Journal?.ISOAbbreviation ||
              '';

            allArticles.push({
              id: `pm_${pmid}`,
              title:
                article?.ArticleTitle?._ || article?.ArticleTitle || 'Untitled',
              abstract: abstract || 'Abstract not available.',
              authors,
              year: String(year),
              journal,
              source: 'PubMed',
              url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
              pmid: String(pmid),
              citationCount: null,
            });
          } catch (_) {}
        }
      } catch (_) {}
    }
    return allArticles;
  } catch (err) {
    console.error('PubMed fetch error:', err.message);
    return [];
  }
}

// OpenAlex

export async function fetchOpenAlex(query, disease, maxResults = 100) {
  try {
    const results = [];
    const perPage = 50;
    const pagesToFetch = Math.ceil(maxResults / perPage);

    for (let page = 1; page <= pagesToFetch; page++) {
      const res = await httpClient.get(BASE_URLS.openalex, {
        params: {
          search: query,
          'per-page': perPage,
          page,
          sort: 'relevance_score:desc',
          filter: 'from_publication_date:2018-01-01',
          select:
            'id,title,abstract_inverted_index,authorships,publication_year,primary_location,cited_by_count,open_access',
        },
      });

      const works = res.data?.results || [];
      if (works.length === 0) break;

      for (const work of works) {
        // Reconstruct abstract from inverted index
        let abstract = '';
        const inv = work.abstract_inverted_index;
        if (inv) {
          const words = [];
          for (const [word, positions] of Object.entries(inv)) {
            for (const pos of positions) {
              words[pos] = word;
            }
          }
          abstract = words.filter(Boolean).join(' ');
        }

        const authors = (work.authorships || [])
          .slice(0, 5)
          .map((a) => a?.author?.display_name)
          .filter(Boolean);

        const venue = work.primary_location?.source?.display_name || '';
        const url =
          work.primary_location?.landing_page_url ||
          work.open_access?.oa_url ||
          `https://openalex.org/${work.id?.split('/').pop()}`;

        results.push({
          id: `oa_${work.id?.split('/').pop()}`,
          title: work.title || 'Untitled',
          abstract: abstract || 'Abstract not available.',
          authors,
          year: String(work.publication_year || 'N/A'),
          journal: venue,
          source: 'OpenAlex',
          url,
          citationCount: work.cited_by_count || 0,
          openAccess: work.open_access?.is_oa || false,
        });
      }
    }
    return results;
  } catch (err) {
    console.error('OpenAlex fetch error:', err.message);
    return [];
  }
}

// ClinicalTrials

export async function fetchClinicalTrials(
  disease,
  intent,
  location,
  maxResults = 30,
) {
  try {
    const statuses =
      intent.includes('trials') && intent.includes('recruiting')
        ? ['RECRUITING']
        : [
            'RECRUITING',
            'NOT_YET_RECRUITING',
            'ACTIVE_NOT_RECRUITING',
            'COMPLETED',
          ];

    const allTrials = [];

    for (const status of statuses.slice(0, 2)) {
      const res = await httpClient.get(BASE_URLS.trials, {
        params: {
          'query.cond': disease || 'medical research',
          'filter.overallStatus': status,
          pageSize: 20,
          format: 'json',
          ...(location && { 'query.locn': location }),
        },
      });

      const studies = res.data?.studies || [];
      for (const study of studies) {
        const proto = study.protocolSection;
        const id = proto?.identificationModule?.nctId;
        const title =
          proto?.identificationModule?.briefTitle || 'Untitled Study';
        const status = proto?.statusModule?.overallStatus || 'Unknown';
        const phase =
          proto?.designModule?.phases?.join(', ') || 'Not specified';

        // Eligibility
        const eligibility = proto?.eligibilityModule;
        const criteria = eligibility?.eligibilityCriteria?.slice(0, 800) || '';
        const minAge = eligibility?.minimumAge || '';
        const maxAge = eligibility?.maximumAge || '';
        const sex = eligibility?.sex || '';

        // Location
        const locations = proto?.contactsLocationsModule?.locations || [];
        const locationStrings = locations
          .slice(0, 3)
          .map((l) => [l.city, l.state, l.country].filter(Boolean).join(', '));

        // Contact
        const contacts = proto?.contactsLocationsModule?.centralContacts || [];
        const contact = contacts[0];

        // Conditions
        const conditions = proto?.conditionsModule?.conditions || [];

        // Interventions
        const interventions = (
          proto?.armsInterventionsModule?.interventions || []
        )
          .slice(0, 3)
          .map((i) => i.name)
          .filter(Boolean);

        allTrials.push({
          id: `ct_${id}`,
          nctId: id,
          title,
          status,
          phase,
          conditions,
          interventions,
          eligibilityCriteria: criteria,
          minAge,
          maxAge,
          sex,
          locations: locationStrings,
          contact: contact
            ? {
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
              }
            : null,
          startDate: proto?.statusModule?.startDateStruct?.date,
          completionDate: proto?.statusModule?.completionDateStruct?.date,
          url: `https://clinicaltrials.gov/study/${id}`,
          source: 'ClinicalTrials.gov',
        });
      }
    }

    // Deduplicate by nctId
    const seen = new Set();
    return allTrials
      .filter((t) => {
        if (seen.has(t.nctId)) return false;
        seen.add(t.nctId);
        return true;
      })
      .slice(0, maxResults);
  } catch (err) {
    console.error('ClinicalTrials fetch error:', err.message);
    return [];
  }
}

// Main retriever

export async function retrieveAll(parsedQuery) {
  const { expandedQuery, pubmedQuery, disease, intents, location } =
    parsedQuery;

  console.log(`📡 Retrieving for: "${expandedQuery}" | disease: ${disease}`);

  // Run all fetches in parallel
  const [pubmedResults, openAlexResults, trialsResults] =
    await Promise.allSettled([
      fetchPubMed(pubmedQuery || expandedQuery, disease, 80),
      fetchOpenAlex(expandedQuery, disease, 100),
      fetchClinicalTrials(disease, intents, location, 30),
    ]);

  const publications = [
    ...(pubmedResults.status === 'fulfilled' ? pubmedResults.value : []),
    ...(openAlexResults.status === 'fulfilled' ? openAlexResults.value : []),
  ];

  const trials =
    trialsResults.status === 'fulfilled' ? trialsResults.value : [];

  console.log(`Raw: ${publications.length} papers, ${trials.length} trials`);

  return { publications, trials };
}
