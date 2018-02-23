function updateBitfinex() {
  var key = ''
  var secret = "";
  var adresseMail = "cams2207@gmail.com";
  
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("SortieScript");
sheet.activate();
  
  // Récupération des Actives Orders
  var apiURL = "https://api.bitfinex.com";
  var apiRequest = "/v1/orders";
  
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
  
  var reponse = UrlFetchApp.fetch(apiURL + apiRequest, params);
  var activeOrders = JSON.parse(reponse.getContentText()); 
  
  // ---------------------------------------------------GESTION DES ACTIVES ORDERS
  // Pour chaque Actives Orders
  for (i = 0; i < Object.keys(activeOrders).length; i++) 
  {
    // Si l'order est de type Stop-Loss
    if(activeOrders[i].type == "exchange stop")
    { 
      if(activeOrders[i].symbol == "btcusd")
      {
        // On va chercher le prix pour savoir si le Stop-Loss est bien calibré
        var orderCurrency = activeOrders[i].symbol;
        
        var request = "https://api.bitfinex.com/v1/pubticker/" + orderCurrency;
        var price = UrlFetchApp.fetch((request), {'muteHttpExceptions': true}); 
        
        // On vérifie si le prix actuel -10% est au dessus du prix de notre stop loss. Si oui, on modifie le stop loss.
        // Si non, on fait rien.
        var priceMinus10percent = Number((JSON.parse(price.getContentText()).last_price * 0.90).toFixed(4));
        
                Logger.log("price : " + activeOrders[i].price + "------------- price -10% : " + priceMinus10percent);
        
        if(priceMinus10percent > Number(activeOrders[i].price))
        {
          // NOTA BENE : Ne pas utiliser le /v1/order/cancel/replace, cela va trop vite, il supprime et essaye de recréer avant même que la suppression soit prise en compte
          // On va donc commencer par supprimer. Attendre 5 secondes puis créer
          
          Logger.log("RECALIBRE -- Symbole : " + activeOrders[i].symbol + " -- Ancien Stop Loss : " + activeOrders[i].price + " -- Nouveau Stop Loss : " + priceMinus10percent);
          
          // Suppresion
          apiRequest = '/v1/order/cancel';
          payload = {
            'request': apiRequest,
            'nonce': Date.now().toString(),
            'order_id': activeOrders[i].id
          }
          
          payload = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(payload)).getDataAsString());
          signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_384, payload, secret);
          signature = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');
          
          params = {
            method: "POST",
            headers: {
              'X-BFX-APIKEY': key,
              'X-BFX-PAYLOAD': payload,
              'X-BFX-SIGNATURE': signature
            },
            body: JSON.stringify(payload),
            muteHttpExceptions: false
          }
          
          reponse = UrlFetchApp.fetch(apiURL + apiRequest, params);
          
          // Attente de 5 secondes pour prise en compte de la demande de suppression
          Utilities.sleep(7000)
          
          // Création du nouveau Stop-Loss
          apiRequest = "/v1/order/new";
          
          payload = {
            'request' : apiRequest, 
            'nonce' : Date.now().toString(),
            'symbol' : activeOrders[i].symbol,
            'amount' : activeOrders[i].remaining_amount,
            'use_remaining' : true,
            'price' : priceMinus10percent.toString(),
            'exchange' : 'bitfinex',
            'type' : 'exchange stop',
            'side' : 'sell'
          };
          
          payload = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(payload)).getDataAsString());
          signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_384, payload, secret);
          signature = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');
          
          params = {
            method: "post",
            headers: {
              'X-BFX-APIKEY': key,
              'X-BFX-PAYLOAD': payload,
              'X-BFX-SIGNATURE': signature
            },
            payload: JSON.stringify(payload),
            contentType: "application/json",
            muteHttpExceptions: false
          }
          reponse = UrlFetchApp.fetch(apiURL + apiRequest, params);
          
          //MailApp.sendEmail(adresseMail, "Recalibration Stop-Loss", " Recalibration STOP-LOSS pour " + activeOrders[i].symbol + " -- Ancien Prix : " + activeOrders[i].price + " -- Nouveau prix  : " + priceMinus10percent);
                   
          // This logs the value in the very last cell of this sheet
          var lastRow = sheet.getLastRow();
          var lastColumn = sheet.getLastColumn();
          var lastCell = sheet.getRange(lastRow + 1, lastColumn);
          lastCell.setValue("Recalibration STOP-LOSS pour " + activeOrders[i].symbol + " -- Ancien Prix : " + activeOrders[i].price + " -- Nouveau prix  : " + priceMinus10percent);          
        }
      }
    }
  }
  // --------------------------------------------------FIN ----------- GESTION DES ACTIVES ORDERS
  
  // --------------------------------------------------GESTION DES STOP-LOSS Non-Positionné
  apiRequest = "/v1/balances";
  
  payload = {
    'request' : apiRequest, 
    'nonce' : Date.now().toString()
  };
  
  payload = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(payload)).getDataAsString());
  signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_384, payload, secret);
  signature = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');
  
  params = {
    method: "post",
    headers: {
      'X-BFX-APIKEY': key,
      'X-BFX-PAYLOAD': payload,
      'X-BFX-SIGNATURE': signature
    },
    payload: JSON.stringify(payload),
    contentType: "application/json",
    muteHttpExceptions: false
  }
  
  reponse = UrlFetchApp.fetch(apiURL + apiRequest, params);
  var balances = JSON.parse(reponse.getContentText()); 
   
  // Pour chaque monnaie du porte monnaie
  for (i = 0; i < Object.keys(balances).length; i++) 
  {
    // On exclu les USD
    if(balances[i].currency.toUpperCase() != "USD")
    {
      if(balances[i].currency.toUpperCase() == "BTC")
      {
        // On regarde si une monnaie n'a pas de STOP-Loss pour la totalité
        // Si oui, on créer le Stop-Loss
        if(balances[i].available > 0)
        {
          apiRequest = "/v1/order/new";
          
          // On récupère le prix actuel
          request = "https://api.bitfinex.com/v1/pubticker/" + balances[i].currency + "usd";
          price = UrlFetchApp.fetch((request), {'muteHttpExceptions': true}); 
          
          // On calcul le prix à 10% de moins
          priceMinus10percent = Number((JSON.parse(price.getContentText()).last_price * 0.90).toFixed(4)); 
          
          payload = {
            'request' : apiRequest, 
            'nonce' : Date.now().toString(),
            'symbol' : balances[i].currency + "usd",
            'amount' : balances[i].available,
            'use_remaining' : true,
            'price' : priceMinus10percent.toString(),
            'exchange' : 'bitfinex',
            'type' : 'exchange stop',
            'side' : 'sell'
          };
          
          payload = Utilities.base64Encode(Utilities.newBlob(JSON.stringify(payload)).getDataAsString());
          signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_384, payload, secret);
          signature = signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');
          
          params = {
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
          reponse = UrlFetchApp.fetch(apiURL + apiRequest, params);
          
          Logger.log(reponse);
          // A RAJOUTER - Envoi d'un mail
          Logger.log("CREATION : " + balances[i].currency.toUpperCase() + "@" + priceMinus10percent); 
          
          //MailApp.sendEmail(adresseMail, "Nouveau Stop-Loss", " -- Symbol : " + balances[i].currency + " -- Prix : " + priceMinus10percent);
          
          // This logs the value in the very last cell of this sheet
          var lastRow = sheet.getLastRow();
          var lastColumn = sheet.getLastColumn();
          var lastCell = sheet.getRange(lastRow + 1, lastColumn);
          lastCell.setValue("Nouveau Stop-Loss -- Symbol : " + balances[i].currency + " -- Prix : " + priceMinus10percent);
          
        }
      }
    }
  }
  // --------------------------------------------------FIN ----------- GESTION DES STOP-LOSS Non-Positionné
}
