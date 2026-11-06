# nishisumi

大阪中小企業家同友会 西成住之江支部 ポータルサイト

## ファイル構成

- `index.html`: トップページ。Google スプレッドシート CSV を優先し、未設定時は `data/events.json` を読み込みます。年間スケジュールも同じイベントシートから自動表示します
- `admin.html`: イベント運用ガイドとデータ確認ページ
- `data/site-config.json`: Google スプレッドシートの CSV URL 設定
- `data/events.json`: フォールバック用イベントデータ
- `data/events-sheet-template.csv`: Google スプレッドシート作成用テンプレート
- `data/groups.json`: グループ紹介のフォールバック用データ
- `data/groups-sheet-template.csv`: グループ紹介シートのテンプレート
- `data/reports.json`: 活動報告のフォールバック用データ
- `data/reports-sheet-template.csv`: 活動報告シートのテンプレート
- `report.html`: 活動報告ページ
- `group.html`: 小グループ会ページ
- `github_update_guide.html`: 担当者向け更新手順

## ローカル確認

このサイトは静的HTMLなので、ビルドは不要です。`fetch()` で `data/*.json` を読むため、`file://` ではなくローカルサーバー経由で開いてください。

```bash
npm run dev
```

起動後に以下をブラウザで開きます。

- `http://localhost:8000/`
- `http://localhost:8000/report.html`
- `http://localhost:8000/group.html`
- `http://localhost:8000/admin.html`

`npm` を使わない場合は、同じことを次でも実行できます。

```bash
python3 -m http.server 8000
```

## 運用メモ

日々の更新は Google スプレッドシートを更新する運用を想定しています。イベント一覧、グループ紹介、活動報告はそれぞれ別シートで管理できます。トップページの「2026年度 年間スケジュール」もイベント一覧シートの内容を使って自動更新されます。

初回セットアップ:

1. Google スプレッドシートを作成する
2. イベント列を用意する（`年月日` / `種別` / `小グループ` / `round` / `タイトル` / `場所` / `時間` / `e.doyu_url` / `直近のイベント案内表示`）
3. イベント用シートを CSV としてウェブ公開する
4. `data/site-config.json` の `sheetCsvUrl` にその URL を設定する
5. グループ紹介もシート管理したい場合は、別シートを CSV としてウェブ公開する
6. `data/site-config.json` の `groupSheetCsvUrl` にその URL を設定する
7. グループごとのメンバー一覧を別シートで管理する場合は、各シートを CSV 公開して `groupMemberSheetCsvUrls.G1` 〜 `G4` に設定する
8. 公開URLで安定して読みたい場合は、各タブの `gid` を `groupMemberSheetGids.G1` 〜 `G4` に設定する
9. もしくは同じスプレッドシート内に `グループ G1` 〜 `グループ G4` シートがある場合は、`spreadsheetEditUrl` と `groupMemberSheetNames` を設定する
10. 活動報告もシート管理したい場合は、別シートを CSV としてウェブ公開する
11. `data/site-config.json` の `reportSheetCsvUrl` にその URL を設定する

イベントシートの補足:

- `直近のイベント案内表示` が `公開` の行だけが、トップページの「直近のイベント案内」に掲載されます
- トップページの「2026年度 年間スケジュール」は、イベントシート内の全行を表示します

### Google スプレッドシート公開URLの取り方

1. Google スプレッドシートを開く
2. `ファイル` → `共有` → `ウェブに公開` を開く
3. 左のプルダウンは `ドキュメント全体` のままにする
4. 右のプルダウンを `ウェブページ` から `カンマ区切りの値（.csv）` に変える
5. `公開する` を押す
6. 表示されたリンクをコピーする
7. `data/site-config.json` の `sheetCsvUrl` に貼り付ける

設定例:

```json
{
  "sheetCsvUrl": "https://docs.google.com/spreadsheets/d/XXXXX/pub?output=csv",
  "fallbackJsonUrl": "./data/events.json",
  "groupSheetCsvUrl": "https://docs.google.com/spreadsheets/d/XXXXX/pub?gid=123456789&single=true&output=csv",
  "groupMemberSheetCsvUrls": {
    "G1": "https://docs.google.com/spreadsheets/d/XXXXX/pub?gid=111111111&single=true&output=csv",
    "G2": "https://docs.google.com/spreadsheets/d/XXXXX/pub?gid=222222222&single=true&output=csv",
    "G3": "https://docs.google.com/spreadsheets/d/XXXXX/pub?gid=333333333&single=true&output=csv",
    "G4": "https://docs.google.com/spreadsheets/d/XXXXX/pub?gid=444444444&single=true&output=csv"
  },
  "groupMemberSheetGids": {
    "G1": "111111111",
    "G2": "222222222",
    "G3": "333333333",
    "G4": "444444444"
  },
  "groupMemberSheetNames": {
    "G1": "グループ G1",
    "G2": "グループ G2",
    "G3": "グループ G3",
    "G4": "グループ G4"
  },
  "spreadsheetEditUrl": "https://docs.google.com/spreadsheets/d/XXXXX/edit",
  "fallbackGroupsUrl": "./data/groups.json",
  "reportSheetCsvUrl": "https://docs.google.com/spreadsheets/d/XXXXX/pub?gid=987654321&single=true&output=csv",
  "fallbackReportsUrl": "./data/reports.json",
  "reportDriveFolderUrl": "https://drive.google.com/drive/folders/XXXXX",
  "reportSheetEditUrl": "https://docs.google.com/spreadsheets/d/XXXXX/edit#gid=987654321"
}
```

日々の更新:

1. Google スプレッドシートにイベントを追加・修正する
2. グループ紹介を変える場合はグループ紹介シートを更新する
3. 活動報告を追加する場合は活動報告シートを更新する
4. 数分待って公開ページを確認する

写真リンク入力を少し楽にする運用:

1. `data/site-config.json` の `reportDriveFolderUrl` に画像保存先フォルダURLを入れる
2. `data/site-config.json` の `reportSheetEditUrl` に活動報告シートの編集URLを入れる
3. 全自動にしたい場合は、活動報告のスプレッドシートで `拡張機能` → `Apps Script` を開き、`apps-script/report-photo-helper/` の内容を貼り付けて Web アプリとしてデプロイし、そのURLを `data/site-config.json` の `reportSheetWebhookUrl` に入れる
4. `report.html` で写真がないカードの `📸 写真をここに差し替え` を押す
5. 別タブで `admin.html` の補助画面が開き、Driveアップロードと反映用フォームが表示される
6. そこから Drive フォルダを開き、共有リンクを `画像Url` に貼って送信する

補足:

- `data/site-config.json` の `sheetCsvUrl` が空の場合は `data/events.json` を表示します
- `data/site-config.json` の `groupSheetCsvUrl` が空の場合は `data/groups.json` を表示します
- `data/site-config.json` の `reportSheetCsvUrl` が空の場合は `data/reports.json` を表示します
- `admin.html` で現在どのデータ元を読んでいるか確認できます
- `group` は `G1` 〜 `G4`、`round` は `1` 〜 `4` を入れると `group.html` の予定欄にも反映されます
- グループ紹介シートの列は `group` / `number` / `name` / `leader` / `memberCount` / `manager` / `visible` を使えます
- グループカードにメンバーを表示する標準方法は、公開中のグループ紹介シートに `memberNames` または `メンバー一覧` 列を追加して、改行や `、` 区切りで入力する運用です
- グループごとのメンバーを別シートで管理する場合は、そのシート自体が公開CSVとして読める必要があります。`name` 列を `groupMemberSheetCsvUrls.G1` 〜 `G4` から参照できます。`氏名` / `名前` / `メンバー名` 列でも読めます
- Google スプレッドシートの編集画面でタブが見えていても、そのタブが「ウェブに公開」されていなければ静的HTMLからは読めません
- 活動報告シートの列は `年月日` / `種別` / `タイトル` / `内容` / `タグ` / `画像Url` / `imageFileId` / `imageUrl` / `画像説明` / `previewImage` / `公開/非公開` を使えます
- 旧列名の `date` / `category` / `title` / `text` / `keywords` / `imageUrl` / `imageAlt` / `visible` でも引き続き読めます
- `reportDriveFolderUrl` は「画像をアップロードするDriveフォルダを開くためのURL」です。サイトから直接保存はしません
- `reportSheetEditUrl` は「活動報告シートの編集画面URL」です。公開CSVのURLとは別に、編集用URLを設定してください
- `reportSheetWebhookUrl` は「Apps Script と連携して `画像Url` を直接書き込む Web アプリURL」です。空なら、ヘルパー画面は手動貼り付け案内のまま動きます
- 画像はシートに直接挿入せず、Drive の共有リンクを `画像Url` に貼る運用がおすすめです。活動報告ページは共有リンクから Google Drive の画像IDを読み取り、そのまま表示できます
- Drive 側は「リンクを知っている全員が閲覧可」にしてください。`画像Url` には Markdown 形式の `[...](...)` を入れても読めますが、通常は共有リンクそのものを入れる運用が簡単です
- `imageFileId` / `imageUrl` / `previewImage` は補助列です。Apps Script から更新する場合は自動で入ります
- `imageUrl` は `https://drive.google.com/thumbnail?id=画像ID&sz=w1600` の形式にしておくと、`previewImage` でそのまま使いやすいです
- `previewImage` は `imageUrl` から自動生成できます。テンプレートでは `=IMAGE(H行)` の形を使っています
- `reports-sheet-template.csv` は 2行目に説明用の補助行が入っています。不要なら削除して構いません
- ボタン文言は日付で自動切替します。`linkLabel` 列は不要です

Apps Script 連携メモ:

- `apps-script/report-photo-helper/Code.gs` は、活動報告スプレッドシートに紐づいた Apps Script として使う前提です
- 活動報告シートを開いて `拡張機能` → `Apps Script` から作成すると、同友会の Drive 運用に寄せやすくなります
- 必要なら `sheetName` を活動報告タブ名に合わせて変更してください。空にするとアクティブシートを使います
- Web アプリは「自分として実行」「リンクを知っている全員」が扱いやすい構成です
- 行の特定は `識別子` 列があれば最優先で使い、なければ `年月日` + `タイトル` で照合します

### 写真が管理者の端末でしか表示されない場合

2026-11-05 の読み取り調査では、公開APIの写真1件（2026-08-24）のDrive画像ID
`1R8IWm1oKfJ8I8qUS8YzXG8KQiRus3scs` は、thumbnail / uc / googleusercontent の全候補で
Googleログイン画面へ転送されました。最終HTTPステータスは200でも `Content-Type` は `text/html` で、画像ではありません。
公開設定JSONはローカルと一致し、他3件の画像URLは空でした。

- 写真本体はDriveに保存し、シートにはURLと画像IDを保存します。Vercelへのアップロードやローカルファイルへの保存は行っていません。
- 現在の追跡ファイルに写真本体はありません。`.gitignore` の `mock_uploads/` にあるサンプルは5バイトで、公開データからの参照もありません。
- サイトの画像参照はトップページと活動報告ページで生成します。管理用詳細画面は画像URLを表示し、グループ画面の写真欄はプレースホルダーです。
- 公開データとコードの画像参照に localhost / file:// / Mac絶対パスはなく、今回の原因はファイル名の大小文字やURLエンコードではありません。

現在の修正は、既存のDriveリンク入力UIとシートのURLをそのまま利用します。

- 公開ページは、Apps Scriptの `resource=report-photo&reportId=活動報告ID` から画像データを取得します。
- Apps Scriptは毎回シートの公開状態と登録URLを確認し、実行者権限でDriveの写真を読み取ります。任意のファイルIDや非公開行の写真は配信しません。
- 公開された活動報告に登録することが、写真のサイト掲載指定になります。Drive原本を一般公開にする必要はありませんが、写真データはサイト閲覧者へ公開されます。公開可否の判断・組織の運用規則に従って登録してください。
- 複数の担当者は従来どおりDriveに写真を追加し、リンクを登録します。担当者個人だけでなく、Apps Scriptの実行者も閲覧できる保存先を使ってください。
- 登録時には実行者が写真を読めるか検証します。読めなければシート更新前に拒否します。シート直接編集時は、この検証は通りません。
- JPEG / PNG / WebP / GIFに対応します。8MBを超える原本はDriveのサムネイルを使うため、画質が下がる場合があります。サムネイルがない場合は、8MB以下の掲載用画像を使用してください。
- 写真の表示高速化ではGoogleの表示用画像を最大1600pxの指定で取得し、取得できなければ上記の原本取得へ戻ります。GIFはアニメーションを維持するため原本取得を使います。原本は変更しません。
- 初期表示では `preview=true` でDrive標準の小さなプレビューを先に取得し、描画後に高画質版へ切り替えます。高画質版が失敗してもプレビューは残します。プレビューが作られていない写真やGIFは従来の取得へ戻るため、初期表示の短縮効果はありません。
- 原本へのフォールバック時にもキャッシュが効くよう、サーバーは最大128チャンク（各90KB）を一括取得します。ブラウザーは画像ごとに最大480万文字までsessionStorageへの保存を試みます。容量制限で保存できない場合も表示は継続します。
- 画像データはサーバーで5分間、ブラウザーでは同一タブ内のsessionStorageに5分間キャッシュします。公開状態はシート読み取り時に確認します。シートの写真URL変更では別キャッシュを使いますが、同じDriveファイルの内容差し替えや閲覧権限変更は最大5分反映が遅れる場合があります。キャッシュが利用できない場合も通常取得を続行します。
- 配信に失敗した場合、従来のDrive直接URLへフォールバックし、ブラウザーのコンソールにエラーを出します。原本の削除、実行者権限の剥奪、Apps Scriptの障害・上限超過による取得失敗は防げません。

初回反映の手順（今回のローカル修正では未実施）:

1. `Code.gs` と `appsscript.json` を既存のApps Scriptへ反映します。Drive読み取り権限の承認が必要です。Driveの書き込み権限は要求しません。
2. Webアプリを「自分として実行」、Googleログイン不要でアクセス可能な設定で新しいバージョンへ更新します。既存のデプロイを更新してURLを維持すれば、シート・サイト設定のURL変更は不要です。組織でこの公開運用が許可されることを確認してください。
3. 実行者が既存の写真を閲覧できることを確認します。Drive共有設定の一般公開化は不要です。
4. `index.html` / `report.html` / `admin.html` と `js/report-photos.js` をサイトへ反映します。GitHubへのpushだけではApps Scriptのコードは更新されません。
5. 未ログインの別端末でトップと活動報告の写真を確認します。画像APIは `ok: true` と画像のdata URLを返す必要があります。非公開行・不明なIDでは画像を返さないことも確認します。

初回反映後は、写真ごとのcommit・push・deploy・URL形式変更は不要です。既存の写真URLと原本も維持します。
ローカル検証: `node --test tests/*.test.cjs`（モックを使用、外部接続・シート更新なし）。
技術仕様: https://developers.google.com/apps-script/guides/web と https://developers.google.com/apps-script/reference/drive/file
