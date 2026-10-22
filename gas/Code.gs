function doGet() {
  return HtmlService.createHtmlOutputFromFile('Game')
    .setTitle('かんじの よみかた☆マスター')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
