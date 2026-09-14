/**
 * Keyword taxonomy + tagging for Codabench competitions.
 *
 * Ported from taxonomy.py. The scraped CSV (id, title, organizer,
 * description, url) has no structured "field" or "conference" column —
 * tags are derived by matching keywords against the title + description.
 *
 * Edit the records below to refine the categories; the app picks up
 * changes automatically (no rebuild step needed in dev).
 */

export type TaxonomyGroup = Record<string, string[]>;

export const DOMAINS: TaxonomyGroup = {
  "NLP / Text": [
    "\\bnlp\\b", "language", "\\btext\\b", "\\bllm\\b", "sentiment",
    "translation", "named entity", "\\bner\\b", "summari[sz]ation",
    "question answer", "\\bqa\\b", "document", "chatbot", "dialog",
  ],
  "Computer Vision": [
    "\\bvision\\b", "\\bimage", "segmentation", "object detection",
    "\\bdetection\\b", "classification of image", "\\bvideo\\b",
    "face", "\\bcv\\b", "pixel", "scene", "3d reconstruction",
  ],
  "Speech & Audio": [
    "speech", "\\baudio\\b", "\\bsound\\b", "\\bvoice\\b", "acoustic",
    "music", "speaker",
  ],
  "Time Series / Forecasting": [
    "time series", "forecast", "\\banomaly\\b", "temporal",
  ],
  "Graph / Networks": [
    "\\bgraph\\b", "\\bnode\\b", "knowledge graph", "link prediction",
  ],
  "Reinforcement Learning": [
    "reinforcement", "\\bagent\\b", "\\bpolicy\\b", "reward", "\\brl\\b",
  ],
  "Recommender Systems": [
    "recommend", "\\branking\\b", "collaborative filtering",
  ],
  "Generative / LLM": [
    "generative", "diffusion", "\\bgan\\b", "\\bllm\\b", "foundation model",
    "large language", "text-to-image", "synthesis",
  ],
  "Tabular / Classical ML": [
    "tabular", "regression", "feature engineering", "\\bxgboost\\b",
  ],
};

export const SECTORS: TaxonomyGroup = {
  "Healthcare & Biomedicine": [
    "health", "medic", "clinical", "tumor", "cancer", "disease",
    "patient", "\\bbio", "\\bgene", "protein", "\\bcell", "brain",
    "\\bmri\\b", "\\bct\\b", "radiolog", "diagnos", "drug", "covid",
    "patholog", "genom", "omics",
  ],
  "Finance": [
    "financ", "\\bstock\\b", "credit", "\\bmarket\\b", "trading",
    "fraud", "insurance", "\\bbank",
  ],
  "Climate & Energy": [
    "climate", "weather", "\\benergy\\b", "environment", "\\bsolar\\b",
    "\\bwind\\b", "carbon", "emission", "renewable", "power grid",
  ],
  "E-commerce & Retail": [
    "e-commerce", "ecommerce", "\\bretail\\b", "product", "\\bshop",
    "customer", "\\bsales\\b",
  ],
  "Security & Privacy": [
    "security", "\\bprivacy\\b", "adversarial", "malware", "\\battack\\b",
    "\\bdefen[sc]e", "cyber", "intrusion",
  ],
  "Robotics & Autonomous": [
    "robot", "autonomous", "\\bdriving\\b", "\\bvehicle\\b", "navigation",
    "\\bdrone\\b", "manipulation",
  ],
  "Agriculture & Food": [
    "agricultur", "\\bcrop\\b", "\\bplant\\b", "\\bfood\\b", "farm",
  ],
  "Transportation & Mobility": [
    "traffic", "transport", "mobility", "\\broute\\b", "logistics",
  ],
};

export const CONFERENCES: TaxonomyGroup = {
  "NeurIPS": ["neurips", "\\bnips\\b"],
  "CVPR": ["\\bcvpr\\b"],
  "ICCV": ["\\biccv\\b"],
  "ECCV": ["\\beccv\\b"],
  "ICML": ["\\bicml\\b"],
  "ICLR": ["\\biclr\\b"],
  "ACL": ["\\bacl\\b"],
  "EMNLP": ["\\bemnlp\\b"],
  "NAACL": ["\\bnaacl\\b"],
  "KDD": ["\\bkdd\\b"],
  "AAAI": ["\\baaai\\b"],
  "IJCAI": ["\\bijcai\\b"],
  "MICCAI": ["\\bmiccai\\b"],
  "ISBI": ["\\bisbi\\b"],
  "Interspeech": ["interspeech"],
  "WSDM": ["\\bwsdm\\b"],
  "ECML / PKDD": ["\\becml\\b", "\\bpkdd\\b"],
};

export const COUNTRIES: TaxonomyGroup = {
  "France": ["\\bfrance\\b", "\\bfrench\\b"],
  "USA": ["\\busa\\b", "\\bunited states\\b", "\\bu\\.s\\.a?\\b", "\\bamerican\\b"],
  "United Kingdom": ["\\buk\\b", "\\bunited kingdom\\b", "\\bbritish\\b", "\\bengland\\b", "\\bscotland\\b"],
  "Germany": ["\\bgermany\\b", "\\bgerman\\b"],
  "Spain": ["\\bspain\\b", "\\bspanish\\b"],
  "Italy": ["\\bitaly\\b", "\\bitalian\\b"],
  "Netherlands": ["\\bnetherlands\\b", "\\bdutch\\b"],
  "Switzerland": ["\\bswitzerland\\b", "\\bswiss\\b"],
  "Belgium": ["\\bbelgium\\b", "\\bbelgian\\b"],
  "Austria": ["\\baustria\\b", "\\baustrian\\b"],
  "Portugal": ["\\bportugal\\b", "\\bportuguese\\b"],
  "Poland": ["\\bpoland\\b", "\\bpolish\\b"],
  "Sweden": ["\\bsweden\\b", "\\bswedish\\b"],
  "Norway": ["\\bnorway\\b", "\\bnorwegian\\b"],
  "Finland": ["\\bfinland\\b", "\\bfinnish\\b"],
  "Denmark": ["\\bdenmark\\b", "\\bdanish\\b"],
  "Ireland": ["\\bireland\\b", "\\birish\\b"],
  "Greece": ["\\bgreece\\b", "\\bgreek\\b"],
  "Russia": ["\\brussia\\b", "\\brussian\\b"],
  "China": ["\\bchina\\b", "\\bchinese\\b"],
  "Japan": ["\\bjapan\\b", "\\bjapanese\\b"],
  "South Korea": ["\\bkorea\\b", "\\bkorean\\b"],
  "India": ["\\bindia\\b", "\\bindian\\b"],
  "Singapore": ["\\bsingapore\\b"],
  "Australia": ["\\baustralia\\b", "\\baustralian\\b"],
  "Canada": ["\\bcanada\\b", "\\bcanadian\\b"],
  "Brazil": ["\\bbrazil\\b", "\\bbrazilian\\b"],
  "Mexico": ["\\bmexico\\b", "\\bmexican\\b"],
  "Israel": ["\\bisrael\\b", "\\bisraeli\\b"],
  "Turkey": ["\\bturkey\\b", "\\bturkish\\b"],
};

function compile(group: TaxonomyGroup): Array<[string, RegExp]> {
  return Object.entries(group).map(([name, patterns]) => [
    name,
    new RegExp(patterns.join("|"), "i"),
  ]);
}

const DOMAIN_RULES = compile(DOMAINS);
const SECTOR_RULES = compile(SECTORS);
const CONFERENCE_RULES = compile(CONFERENCES);
const COUNTRY_RULES = compile(COUNTRIES);

function match(text: string, rules: Array<[string, RegExp]>): string[] {
  return rules.filter(([, rx]) => rx.test(text)).map(([name]) => name);
}

export interface Tags {
  domains: string[];
  sectors: string[];
  conferences: string[];
  countries: string[];
}

export function tagRow(title: string, description: string): Tags {
  const text = `${title ?? ""} ${description ?? ""}`;
  return {
    domains: match(text, DOMAIN_RULES),
    sectors: match(text, SECTOR_RULES),
    conferences: match(text, CONFERENCE_RULES),
    countries: match(text, COUNTRY_RULES),
  };
}
