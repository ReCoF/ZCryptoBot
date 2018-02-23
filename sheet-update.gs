function myFunction() {
  
var key = ''
var secret = ""; 

var apiURL = "http://api.bitfinex.com";
var apiRequest = "/v1/balances"; 
var completeURL = apiURL + apiRequest;

var payload = {
  'request' : apiRequest, 
  'nonce' : Date.now().toString()
};

payload = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(payload)).getDataAsString());
var signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_384, payload, secret);
signature = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');
  
var params = {
  method: "post",
  headers: {
    'X-BFX-APIKEY': key,
    'X-BFX-PAYLOAD': payload,
    'X-BFX-SIGNATURE': signature
  },
  payload: JSON.stringify(payload),
  contentType: "application/json",
  muteHttpExceptions: true
}
var response = UrlFetchApp.fetch(completeURL, params);
var json = JSON.parse(response.getContentText());  
var ss = SpreadsheetApp.getActiveSpreadsheet();
var portefeuille = ss.getSheetByName("Portefeuille");
portefeuille.activate();

j=4;
for (i = 0; i < Object.keys(json).length; i++) {
  
  SpreadsheetApp.getActiveSpreadsheet().getRange('A' + j).setValue(json[i].currency);
  
  if (json[i].currency == "usd") {
      SpreadsheetApp.getActiveSpreadsheet().getRange('B' + j).setValue("1");   
  } 
  else {
      var value = "https://api.bitfinex.com/v1/pubticker/" + json[i].currency + "usd";
      var answer = UrlFetchApp.fetch((value), {'muteHttpExceptions': true});         
      SpreadsheetApp.getActiveSpreadsheet().getRange('B' + j).setValue(JSON.parse(answer.getContentText()).last_price);   
  }

  SpreadsheetApp.getActiveSpreadsheet().getRange('C' + j).setValue(json[i].amount);
  
  j++;

}
}
