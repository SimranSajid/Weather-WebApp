# Local location search database

Derived from **Countries States Cities Database**, maintained by dr5hn and contributors:
https://github.com/dr5hn/countries-states-cities-database

This derived database is made available under the Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/
The full upstream license is included in `LICENSE`. Attribution and share-alike apply to this database; this does not select a license for the app's code.

Pinned source: release `v4.0-export.42`, asset `json-countries+states+cities.json.gz`.
See `source.json` for the exact URL, SHA-256 checksum, sizes, counts, and field definitions.
The export contains 250 countries, 5,328 states, and 152,978 cities. These are the actual counts in this release asset, which may differ from the upstream repository's live README.

## Derived format

- `index.json`: country tuples `[id, name, iso2]`, state tuples `[id, name, country_id, first_city_prefix]`, prefix-to-file mapping, and counts.
- `cities/*.json`: city tuples `[normalized_name, name, state_id, latitude, longitude]`. Country relationships are resolved through state IDs.
- City records are ordered by normalized name for binary prefix lookup. Display candidates use locale-aware alphabetical ordering within matching groups.
- Names are normalized once at build time; coordinates retain their source numeric precision.
- The first-city prefix in a state points to a small initial alphabetical city preview. Typing loads the relevant prefix, so this preview does not limit searchable cities.

The upstream compressed source is 3,717,145 bytes (53,102,795 bytes expanded). The derived index and 50 city shards total 8,111,332 bytes. Only the 148,537-byte index and requested prefix shards are downloaded, lazily on first use. The largest city shard is 1,041,244 bytes. A Web Worker parses and searches them, retaining at most four prefix shards in memory. No raw upstream export is included in this project.

To reproduce the derived database, run from the project root:

```sh
node scripts/build-location-data.cjs
```

This downloads the pinned source and license, generates the minimized local files, and prints size/count metadata. Node.js is needed only to regenerate the data; the website requires no package installation or runtime backend.

The matching .js files contain the same records as their JSON counterparts and are loaded lazily only when opening index.html directly with file://. Hosted pages continue to load JSON in a Web Worker.

All A-Z prefixes are included, alongside additional source prefixes for accented and non-Latin names. Matching is case-insensitive: A and a search the same records. The dropdown shows up to 12 matches at a time; typing more letters narrows the full database rather than a fixed list of sample cities.
