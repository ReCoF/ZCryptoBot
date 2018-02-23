function sendEmails() {
  
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("SortieScript");
sheet.activate();
  
  var email = "youremailhere@email.com";
  var header = "----------------------------------------------------------------------- Last hour -----------------------------------------------------------------------\n";
  var d = new Date();
  var currentTime = d.toLocaleTimeString();
  // var currentTimeMinusOneHour = d.SetHours(currentTime.getHours() - 1);
  var subject = "ZCryptoBot - Report for last hour from - " + currentTime;
  
  // Fetch the range of cells A2:B3
  var dataRange = sheet.getRange("A2:A100");
  
  // Fetch values for each row in the Range.
  var data = dataRange.getValues();
  var message  = header;
  
  for (i in data) {
    var row = data[i];
    if (row[0] != "")
    {
    message = message + row[0] + "\n";
    Logger.log(row[0]);
    }

  }
  
  if (message != header)
  {
    MailApp.sendEmail(email, subject, message);
  }
  
  sheet.clear();
  var cell = sheet.getRange("A1");
  cell.setValue("Messages");
}
