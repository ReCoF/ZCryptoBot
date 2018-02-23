function sendEmails() {
  
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("SortieScript");
sheet.activate();
  
  var d = new Date();
  var currentTime = d.toLocaleTimeString();
  // var currentTimeMinusOneHour = d.SetHours(currentTime.getHours() - 1);
  var subject = "ZCryptoBot - Report for last hour from - " + currentTime;
  
  // Fetch the range of cells A2:B3
  var dataRange = sheet.getRange("A2:A100");
  
  // Fetch values for each row in the Range.
  var data = dataRange.getValues();
  var message  = "----------------------------------------------------------------------- Last hour -----------------------------------------------------------------------\n";
  
  for (i in data) {
    var row = data[i];
    message = message + row[0] + "\n";
    Logger.log(row[0]);

  }

  MailApp.sendEmail("cams2207@gmail.com", subject, message);
  
  sheet.clear();
  var cell = sheet.getRange("A1");
  cell.setValue("Messages");
}