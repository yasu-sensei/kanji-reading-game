function doGet() {
  return HtmlService.createHtmlOutputFromFile('Game')
    .setTitle('かん字ファンタジア')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
