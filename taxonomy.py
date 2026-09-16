"""
Keyword taxonomy + tagging for Codabench competitions.

The scraped CSV (id, title, organizer, description, url) has NO structured
"field" or "conference" column. We derive those tags here by matching
keywords against the title + description text.

Each rule is a list of regex fragments. Matching is case-insensitive and
uses word boundaries (\b) so short tokens like "cv" or "acl" don't match
inside unrelated words ("oracle", "scven"...).

Edit the dicts below to refine the categories -- the dashboard picks up
any changes automatically.
"""

import re

# --- Research field / modality --------------------------------------------
DOMAINS = {
    "NLP / Text": [
        r"\bnlp\b", r"language", r"\btext\b", r"\bllm\b", r"sentiment",
        r"translation", r"named entity", r"\bner\b", r"summari[sz]ation",
        r"question answer", r"\bqa\b", r"document", r"chatbot", r"dialog",
    ],
    "Computer Vision": [
        r"\bvision\b", r"\bimage", r"segmentation", r"object detection",
        r"\bdetection\b", r"classification of image", r"\bvideo\b",
        r"face", r"\bcv\b", r"pixel", r"scene", r"3d reconstruction",
    ],
    "Speech & Audio": [
        r"speech", r"\baudio\b", r"\bsound\b", r"\bvoice\b", r"acoustic",
        r"music", r"speaker",
    ],
    "Time Series / Forecasting": [
        r"time series", r"forecast", r"\banomaly\b", r"temporal",
    ],
    "Graph / Networks": [
        r"\bgraph\b", r"\bnode\b", r"knowledge graph", r"link prediction",
    ],
    "Reinforcement Learning": [
        r"reinforcement", r"\bagent\b", r"\bpolicy\b", r"reward", r"\brl\b",
    ],
    "Recommender Systems": [
        r"recommend", r"\branking\b", r"collaborative filtering",
    ],
    "Generative / LLM": [
        r"generative", r"diffusion", r"\bgan\b", r"\bllm\b", r"foundation model",
        r"large language", r"text-to-image", r"synthesis",
    ],
    "Tabular / Classical ML": [
        r"tabular", r"regression", r"feature engineering", r"\bxgboost\b",
    ],
}

# --- Application sector ----------------------------------------------------
SECTORS = {
    "Healthcare & Biomedicine": [
        r"health", r"medic", r"clinical", r"tumor", r"cancer", r"disease",
        r"patient", r"\bbio", r"\bgene", r"protein", r"\bcell", r"brain",
        r"\bmri\b", r"\bct\b", r"radiolog", r"diagnos", r"drug", r"covid",
        r"patholog", r"genom", r"omics",
    ],
    "Finance": [
        r"financ", r"\bstock\b", r"credit", r"\bmarket\b", r"trading",
        r"fraud", r"insurance", r"\bbank",
    ],
    "Climate & Energy": [
        r"climate", r"weather", r"\benergy\b", r"environment", r"\bsolar\b",
        r"\bwind\b", r"carbon", r"emission", r"renewable", r"power grid",
    ],
    "E-commerce & Retail": [
        r"e-commerce", r"ecommerce", r"\bretail\b", r"product", r"\bshop",
        r"customer", r"\bsales\b",
    ],
    "Security & Privacy": [
        r"security", r"\bprivacy\b", r"adversarial", r"malware", r"\battack\b",
        r"\bdefen[sc]e", r"cyber", r"intrusion",
    ],
    "Robotics & Autonomous": [
        r"robot", r"autonomous", r"\bdriving\b", r"\bvehicle\b", r"navigation",
        r"\bdrone\b", r"manipulation",
    ],
    "Agriculture & Food": [
        r"agricultur", r"\bcrop\b", r"\bplant\b", r"\bfood\b", r"farm",
    ],
    "Transportation & Mobility": [
        r"traffic", r"transport", r"mobility", r"\broute\b", r"logistics",
    ],
}

# --- Conference / venue ----------------------------------------------------
# Order matters a little for display; matching is independent per entry.
CONFERENCES = {
    "NeurIPS": [r"neurips", r"\bnips\b"],
    "CVPR": [r"\bcvpr\b"],
    "ICCV": [r"\biccv\b"],
    "ECCV": [r"\beccv\b"],
    "ICML": [r"\bicml\b"],
    "ICLR": [r"\biclr\b"],
    "ACL": [r"\bacl\b"],
    "EMNLP": [r"\bemnlp\b"],
    "NAACL": [r"\bnaacl\b"],
    "KDD": [r"\bkdd\b"],
    "AAAI": [r"\baaai\b"],
    "IJCAI": [r"\bijcai\b"],
    "MICCAI": [r"\bmiccai\b"],
    "ISBI": [r"\bisbi\b"],
    "Interspeech": [r"interspeech"],
    "WSDM": [r"\bwsdm\b"],
    "ECML / PKDD": [r"\becml\b", r"\bpkdd\b"],
}


# --- Country (inferred from free text) ------------------------------------
# Codabench has NO country field, so this is best-effort: we match country
# names + demonyms in the title/description. Coverage is sparse (~6% of
# competitions mention a country at all) and may include false positives.
COUNTRIES = {
    "France": [r"\bfrance\b", r"\bfrench\b"],
    "USA": [r"\busa\b", r"\bunited states\b", r"\bu\.s\.a?\b", r"\bamerican\b"],
    "United Kingdom": [r"\buk\b", r"\bunited kingdom\b", r"\bbritish\b", r"\bengland\b", r"\bscotland\b"],
    "Germany": [r"\bgermany\b", r"\bgerman\b"],
    "Spain": [r"\bspain\b", r"\bspanish\b"],
    "Italy": [r"\bitaly\b", r"\bitalian\b"],
    "Netherlands": [r"\bnetherlands\b", r"\bdutch\b"],
    "Switzerland": [r"\bswitzerland\b", r"\bswiss\b"],
    "Belgium": [r"\bbelgium\b", r"\bbelgian\b"],
    "Austria": [r"\baustria\b", r"\baustrian\b"],
    "Portugal": [r"\bportugal\b", r"\bportuguese\b"],
    "Poland": [r"\bpoland\b", r"\bpolish\b"],
    "Sweden": [r"\bsweden\b", r"\bswedish\b"],
    "Norway": [r"\bnorway\b", r"\bnorwegian\b"],
    "Finland": [r"\bfinland\b", r"\bfinnish\b"],
    "Denmark": [r"\bdenmark\b", r"\bdanish\b"],
    "Ireland": [r"\bireland\b", r"\birish\b"],
    "Greece": [r"\bgreece\b", r"\bgreek\b"],
    "Russia": [r"\brussia\b", r"\brussian\b"],
    "China": [r"\bchina\b", r"\bchinese\b"],
    "Japan": [r"\bjapan\b", r"\bjapanese\b"],
    "South Korea": [r"\bkorea\b", r"\bkorean\b"],
    "India": [r"\bindia\b", r"\bindian\b"],
    "Singapore": [r"\bsingapore\b"],
    "Australia": [r"\baustralia\b", r"\baustralian\b"],
    "Canada": [r"\bcanada\b", r"\bcanadian\b"],
    "Brazil": [r"\bbrazil\b", r"\bbrazilian\b"],
    "Mexico": [r"\bmexico\b", r"\bmexican\b"],
    "Israel": [r"\bisrael\b", r"\bisraeli\b"],
    "Turkey": [r"\bturkey\b", r"\bturkish\b"],
}


def _compile(groups):
    return {
        name: re.compile("|".join(pats), re.IGNORECASE)
        for name, pats in groups.items()
    }


_DOMAIN_RE = _compile(DOMAINS)
_SECTOR_RE = _compile(SECTORS)
_CONF_RE = _compile(CONFERENCES)
_COUNTRY_RE = _compile(COUNTRIES)


def _match(text, compiled):
    return [name for name, rx in compiled.items() if rx.search(text)]


def tag_row(title: str, description: str):
    """Return (domains, sectors, conferences, countries) lists for one competition."""
    text = f"{title or ''} {description or ''}"
    return (
        _match(text, _DOMAIN_RE),
        _match(text, _SECTOR_RE),
        _match(text, _CONF_RE),
        _match(text, _COUNTRY_RE),
    )
