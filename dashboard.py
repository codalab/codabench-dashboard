"""
Codabench competitions dashboard.

Run with:
    pip install streamlit plotly pandas
    streamlit run dashboard.py

Filters in the sidebar let you slice the ~1.3k competitions by research
field (NLP, CV, ...), application sector (healthcare, finance, ...),
conference/venue, organizer, and free-text search.
"""

import pandas as pd
import plotly.express as px
import streamlit as st

from taxonomy import DOMAINS, SECTORS, CONFERENCES, COUNTRIES, tag_row

CSV_PATH = "codabench_competitions.csv"

st.set_page_config(page_title="Codabench Competitions", layout="wide")


@st.cache_data
def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["description"] = df["description"].fillna("")
    tags = df.apply(lambda r: tag_row(r["title"], r["description"]), axis=1)
    df["domains"] = [t[0] for t in tags]
    df["sectors"] = [t[1] for t in tags]
    df["conferences"] = [t[2] for t in tags]
    df["countries"] = [t[3] for t in tags]
    df["has_domain"] = df["domains"].str.len() > 0
    return df


def explode_counts(df: pd.DataFrame, col: str) -> pd.DataFrame:
    s = df.explode(col)[col].dropna()
    out = s.value_counts().rename_axis(col).reset_index(name="count")
    return out


df = load_data(CSV_PATH)

# --------------------------------------------------------------------------
# Sidebar filters
# --------------------------------------------------------------------------
st.sidebar.title("🔎 Filters")

sel_domains = st.sidebar.multiselect("Research field", list(DOMAINS.keys()))
sel_sectors = st.sidebar.multiselect("Application sector", list(SECTORS.keys()))
sel_confs = st.sidebar.multiselect("Conference / venue", list(CONFERENCES.keys()))
sel_countries = st.sidebar.multiselect("Country (inferred)", list(COUNTRIES.keys()))

organizers = sorted(df["organizer"].dropna().unique())
sel_orgs = st.sidebar.multiselect("Organizer", organizers)

search = st.sidebar.text_input("Search title / description")

match_mode = st.sidebar.radio(
    "Tag match mode", ["Any selected (OR)", "All selected (AND)"], index=0
)
require_all = match_mode.startswith("All")


def tag_filter(series, selected):
    if not selected:
        return pd.Series(True, index=series.index)
    sel = set(selected)
    if require_all:
        return series.apply(lambda tags: sel.issubset(set(tags)))
    return series.apply(lambda tags: bool(sel & set(tags)))


mask = (
    tag_filter(df["domains"], sel_domains)
    & tag_filter(df["sectors"], sel_sectors)
    & tag_filter(df["conferences"], sel_confs)
    & tag_filter(df["countries"], sel_countries)
)
if sel_orgs:
    mask &= df["organizer"].isin(sel_orgs)
if search:
    blob = (df["title"].fillna("") + " " + df["description"]).str.lower()
    mask &= blob.str.contains(search.lower(), regex=False)

fdf = df[mask]

# --------------------------------------------------------------------------
# Header + KPIs
# --------------------------------------------------------------------------
st.title("🏆 Codabench Competitions Dashboard")
st.caption(
    "Fields, sectors and conferences are inferred from the title + description "
    "via keyword rules in taxonomy.py — edit that file to refine the categories."
)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Competitions (filtered)", f"{len(fdf):,}", f"of {len(df):,}")
c2.metric("Organizers", f"{fdf['organizer'].nunique():,}")
c3.metric("Tagged with a field", f"{int(fdf['has_domain'].sum()):,}")
c4.metric("Linked to a conference",
          f"{int((fdf['conferences'].str.len() > 0).sum()):,}")

# --------------------------------------------------------------------------
# Charts
# --------------------------------------------------------------------------
col_l, col_r = st.columns(2)

with col_l:
    st.subheader("By research field")
    d = explode_counts(fdf, "domains")
    if len(d):
        st.plotly_chart(
            px.bar(d, x="count", y="domains", orientation="h").update_yaxes(
                categoryorder="total ascending"),
            width='stretch',
        )
    else:
        st.info("No field tags in the current selection.")

with col_r:
    st.subheader("By application sector")
    s = explode_counts(fdf, "sectors")
    if len(s):
        st.plotly_chart(
            px.bar(s, x="count", y="sectors", orientation="h").update_yaxes(
                categoryorder="total ascending"),
            width='stretch',
        )
    else:
        st.info("No sector tags in the current selection.")

col_a, col_b = st.columns(2)

with col_a:
    st.subheader("Top organizers")
    top = (
        fdf["organizer"].value_counts().head(15)
        .rename_axis("organizer").reset_index(name="count")
    )
    if len(top):
        st.plotly_chart(
            px.bar(top, x="count", y="organizer", orientation="h").update_yaxes(
                categoryorder="total ascending"),
            width='stretch',
        )

with col_b:
    st.subheader("By conference / venue")
    cf = explode_counts(fdf, "conferences")
    if len(cf):
        st.plotly_chart(
            px.pie(cf, names="conferences", values="count", hole=0.4),
            width='stretch',
        )
    else:
        st.info("No conference tags in the current selection.")

st.subheader("By country (inferred from text)")
cc = explode_counts(fdf, "countries")
if len(cc):
    st.plotly_chart(
        px.bar(cc, x="countries", y="count"),
        width='stretch',
    )
else:
    st.info("No country mentions in the current selection.")

# --------------------------------------------------------------------------
# Table + export
# --------------------------------------------------------------------------
st.subheader(f"Competitions ({len(fdf):,})")

table = fdf[["id", "title", "organizer", "domains", "sectors",
             "conferences", "countries", "url"]].copy()
for c in ["domains", "sectors", "conferences", "countries"]:
    table[c] = table[c].apply(lambda x: ", ".join(x))

st.dataframe(
    table,
    width='stretch',
    hide_index=True,
    column_config={"url": st.column_config.LinkColumn("url", display_text="open")},
)

st.download_button(
    "⬇️ Download filtered CSV",
    fdf.drop(columns=["has_domain"]).to_csv(index=False).encode("utf-8"),
    file_name="codabench_filtered.csv",
    mime="text/csv",
)
