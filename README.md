# 줍줍노트 MVP

Browser extension and local web home for collecting links, images, videos, and materials into a personal CSV archive.

## Structure

- `extension/`: Chrome extension for collecting links, images, videos, and materials.
- `web/`: local web home for opening `줍줍노트.csv` and organizing collected cards.
- `ios/ZZupZZupNote/`: SwiftUI iPhone/iPad app that reads and writes the same Supabase `zzup_clips` data.
- `safari/`: Safari Web Extension packaging notes and generated Xcode project location.
- `tools/package_safari_extension.mjs`: helper script for creating a Safari Web Extension Xcode project when Xcode is installed.
- `apps-script/`: Google Apps Script Web App endpoint for appending rows to Google Sheets.
- `shared/`: shared schema, tag suggestion, and CSV helpers.

## CSV Format

Rows are stored in `줍줍노트.csv` with these columns:

```csv
id,수집 일시,유형,주운 글,수집한 이유,연결/확장,활용처,다음 액션,출처,사이트명,아이콘 URL,이미지 경로,이미지 URL,제목,태그,상태,별표,확인 횟수,마지막 확인
```

## Desktop Setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select the `extension/` folder.
5. Open the extension options.
6. Choose a CSV storage folder.
7. Collect links, images, videos, and materials from the context menu or popup.

## Local CSV + Images

When using CSV fallback, choose a folder such as:

```text
줍줍노트/
```

The extension writes:

```text
줍줍노트/
  줍줍노트.csv
  images/
```

Use the image context menu to save images:

```text
Right click image -> 이미지 줍줍하기
```

The image file is saved under `images/`, and the CSV row stores both `이미지 경로` and `이미지 URL`.

## Google Sheets Setup

1. Create a new Google Sheet.
2. Rename the first sheet or let the script create a sheet named `줍줍노트`.
3. Open `Extensions -> Apps Script`.
4. Paste the contents of `apps-script/Code.gs`.
5. Optional: set a script property named `JJNT_TOKEN`.
6. If the Apps Script project was not created from the Sheet, set `SPREADSHEET_ID` to the Google Sheet ID.
7. Deploy as `Web app`.
8. Set execute access so the extension can call the URL.
9. Copy the Web App URL ending in `/exec`.
10. Paste it into the 줍줍노트 extension settings.
11. If you set `JJNT_TOKEN`, paste the same token into the extension settings.

## Spreadsheet Use

Open `줍줍노트.csv` with Excel, Numbers, or Google Sheets. The extension writes UTF-8 CSV with a BOM so Korean text opens cleanly in spreadsheet apps.

## Web Viewer

Run the local web viewer:

```sh
python3 -m http.server 4175
```

Then open:

```text
http://127.0.0.1:4175/web/
```

Use `CSV 열기` to load `줍줍노트.csv`. If you collected local images, use `이미지 함께 열기` and select the files inside the `images/` folder so cards can show thumbnails.

## Safari Extension

Apple packages Safari Web Extensions inside a macOS/iOS app. After installing full Xcode, run:

```sh
node tools/package_safari_extension.mjs
```

The generated Xcode project is written to:

```text
safari/
```

Then open the Xcode project, select your signing team, run the app, and enable 줍줍노트 in Safari Settings > Extensions.
