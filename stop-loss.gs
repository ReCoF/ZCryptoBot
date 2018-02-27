var key = 'B8A5tEOuJktzUz9j0qnxtJZ2hStVsytTnaGHUaG4o0s';
var secret = "FVfNnKdRujuf4JHBmNzpDgarXJFi2QZuD023Axb5B5K";

// Adresse mail  de réception
var adresseMail = "remibaccofin@gmail.com";

// Permet de ne pas créer un stop loss mais une double offre (Vente à +11% ou -10%)
var CreationOCO = true;

function updateBitfinexNew() {
  // Récupération des Actives Orders
  var activeOrders = GetActiveOrders();

  // ---------------------------------------------------GESTION DES ACTIVES ORDERS
  // Pour chaque Actives Orders
  for (i = 0; i < Object.keys(activeOrders).length; i++)
  {
    if(activeOrders[i].type == "exchange limit" && activeOrders[i].oco_order != null)
    {
      // ---- On est dans le cas d'une OCO Order positionnée ---- //

      // On récupère l'OCO Order
      var IdOCOOrder = activeOrders[i].oco_order;
      var OCOOrder = GetOrderStatus(IdOCOOrder);

      // On va chercher le prix pour savoir si le Stop-Loss de l'OCO est bien calibré
      var price = GetActualSymbolPrice(activeOrders[i].symbol)

      // On vérifie si le prix actuel -10% est au dessus du prix de notre stop loss. Si oui, on modifie le stop loss de l'OCO.
      // Si non, on fait rien.
      var priceMinus10percent = Number((JSON.parse(price.getContentText()).last_price * 0.90).toFixed(3));
      
      Logger.log(Number(priceMinus10percent) + " -- " +  OCOOrder.price);
      
      if(Number(priceMinus10percent) > Number(OCOOrder.price))
      {
        CancelMultipleOrders([Number(activeOrders[i].id),Number(IdOCOOrder)]);

        //Creation
        // Attente de 10 secondes pour prise en compte de la demande de suppression
        Utilities.sleep(10000)

        NewOCOOrder(activeOrders[i].Symbol, activeOrders[i].remaining_amount, activeOrders[i].price, priceMinus10percent, 'sell');
        
        WriteInSheetMail("Recalibration OCO STOP-LOSS pour " + activeOrders[i].symbol + " -- Prix Haut (OCO) : " + activeOrders[i].price + " -- Ancien Prix : " + activeOrders[i].price + " -- Nouveau prix  : " + priceMinus10percent);          
      }
    }


    // Si l'order est de type Stop-Loss
    if(activeOrders[i].type == "exchange stop" && activeOrders[i].oco_order == null)
    {
      // On va chercher le prix pour savoir si le Stop-Loss est bien calibré
      var orderCurrency = activeOrders[i].symbol;

      var request = "https://api.bitfinex.com/v1/pubticker/" + orderCurrency;
      var price = UrlFetchApp.fetch((request), {'muteHttpExceptions': true});

      // On vérifie si le prix actuel -10% est au dessus du prix de notre stop loss. Si oui, on modifie le stop loss.
      // Si non, on fait rien.
      var priceMinus10percent = Number((JSON.parse(price.getContentText()).last_price * 0.90).toFixed(3));
      if(priceMinus10percent > Number(activeOrders[i].price))
      {
        // NOTA BENE : Ne pas utiliser le /v1/order/cancel/replace, cela va trop vite, il supprime et essaye de recréer avant même que la suppression soit prise en compte
        // On va donc commencer par supprimer. Attendre 5 secondes puis créer

        Logger.log("RECALIBRE -- Symbole : " + activeOrders[i].symbol + " -- Ancien Prix : " + activeOrders[i].price + " -- Nouveau Prix : " + priceMinus10percent);

        // Suppresion
        CancelOrder(activeOrders[i].id);

        // Attente de 7 secondes pour prise en compte de la demande de suppression
        Utilities.sleep(7000)

        // Création du nouveau Stop-Loss
        NewOrder(activeOrders[i].symbol, activeOrders[i].remaining_amount, priceMinus10percent.toString(), 'exchange stop', 'sell');

        // On recherche le prix d'achat du Stop-Loss pour calculer les pertes/gains
        var lastBuyOrderPrice;
        var lastBuyOrderAmount;

        // Recherche des derniers trades sur cette monnaie
        var pastTrades = GetLastTrades(activeOrders[i].symbol, 5);

        Logger.log(pastTrades);

        for(var w = 0; w < Object.keys(pastTrades).length; w++)
        {
          if(pastTrades[w].type.toUpperCase() == "BUY")
          {
              lastBuyOrderPrice = pastTrades[w].price;
              lastBuyOrderAmount = pastTrades[w].amount;
          }
        }
        Logger.log("Price de l'ordre : " + Number(activeOrders[i].price).toFixed(2) + " -- remaining_amount : " + Number(activeOrders[i].remaining_amount).toFixed(2) + " -- Prix du dernier prix d'achat : " + Number(lastBuyOrderPrice).toFixed(2));
        var pertegain = (Number(activeOrders[i].price).toFixed(2) * Number(activeOrders[i].remaining_amount).toFixed(2)) - (Number(lastBuyOrderPrice).toFixed(2) * Number(activeOrders[i].remaining_amount.toFixed(2)));
        
        WriteInSheetMail("Recalibration STOP-LOSS pour " + activeOrders[i].symbol + " -- Ancien Prix : " + activeOrders[i].price + " -- Nouveau prix  : " + priceMinus10percent);          
      }
    }
  }
  // --------------------------------------------------FIN ----------- GESTION DES ACTIVES ORDERS

  // --------------------------------------------------GESTION DES STOP-LOSS Non-Positionné

  var balances = GetBalances();

  // Pour chaque monnaie du porte monnaie
  for (i = 0; i < Object.keys(balances).length; i++)
  {
    // On exclu les USD
    if(balances[i].currency.toUpperCase() != "USD")
    {
      // On regarde si une monnaie n'a pas de STOP-Loss pour la totalité
      // Si oui, on créer le Stop-Loss
      if(balances[i].available > 0)
      {
        // On récupère le prix actuel
        price = GetActualSymbolPrice(balances[i].currency + "usd");
        Logger.log("1 - " + price.toString());
        if(price != null && price.toString() != "{\"message\":\"Unknown symbol\"}")
        {
          // On calcul le prix à 10% de moins
          priceMinus10percent = Number((JSON.parse(price.getContentText()).last_price * 0.90).toFixed(3));
          
          // On calcul le prix à +11% pour l'OCO
          if(CreationOCO == true)
          {
            var pricePlus11percent = Number((JSON.parse(price.getContentText()).last_price * 1.11).toFixed(3));
            
            var response = NewOCOOrder(balances[i].currency + "usd", balances[i].available, pricePlus11percent.toString(), priceMinus10percent.toString(), 'sell');
            
            if(response.message.toString().indexOf("Invalid order") != 0)
            {
              WriteInSheetMail("Nouveau OCO Stop-Loss -- Symbol : " + balances[i].currency + "Prix Haut : " + pricePlus11percent +" -- Prix Bas : " + priceMinus10percent);      
            }
          }
        }
        else
        {
          var response = JSON.parse(NewOrder(balances[i].currency + "usd", balances[i].available, priceMinus10percent.toString(), 'exchange stop', 'sell'));
          
          if(response.message.toString().indexOf("Invalid order") != 0)
          {
            WriteInSheetMail("Nouveau  Stop-Loss -- Symbol : " + balances[i].currency +" -- Prix  : " + priceMinus10percent);      
          }
        }

        // A RAJOUTER - Envoi d'un mail
        Logger.log("CREATION : " + balances[i].currency.toUpperCase() + "@" + priceMinus10percent);

        //MailApp.sendEmail(adresseMail, "Nouveau Stop-Loss", " -- Symbol : " + balances[i].currency + " -- Prix : " + priceMinus10percent);
      }
    }
  }
  // --------------------------------------------------FIN ----------- GESTION DES STOP-LOSS Non-Positionné
}

function WriteInSheetMail (message)
{
  // Paramètre de la Sheet de temporisation pour l'envoi de mail
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("SortieScript");
  sheet.activate();
  
  // This logs the value in the very last cell of this sheet
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var lastCell = sheet.getRange(lastRow + 1, lastColumn);
  lastCell.setValue(message.toString());
}

function GetBalances ()
{
  var payload = {
      'request' : "/v1/balances",
      'nonce' : Date.now().toString()
    };

    return SendRequest("/v1/balances", payload);
}

function NewOrder (Symbol, Amount, Price, Type, Side)
{
  var payload = {
    'request' : "/v1/order/new",
    'nonce' : Date.now().toString(),
    'symbol' : Symbol,
    'amount' : Amount,
    'use_remaining' : true,
    'price' : Price,
    'exchange' : 'bitfinex',
    'type' : Type,
    'side' : Side
  };

  return SendRequest("/v1/order/new", payload);
}

function NewOCOOrder (Symbol, Amount, Price, OCOPrice, Side)
{
  var payload = {
    'request' : "/v1/order/new",
    'nonce' : Date.now().toString(),
    'symbol' : Symbol,
    'amount' : Amount,
    'use_remaining' : true,
    'price' : Price.toString(),
    'exchange' : 'bitfinex',
    'type' : 'exchange limit',
    'side' : Side,
    'ocoorder' : true,
    'sell_price_oco' : OCOPrice.toString()
  };

  return SendRequest("/v1/order/new", payload);
}

function GetLastTrades (Symbol, NbToReturn)
{
  var payload = {
    'request' : "/v1/mytrades",
    'nonce' : Date.now().toString(),
    'symbol' : Symbol,
    'limit_trades' : NbToReturn
  };

  return SendRequest("/v1/mytrades", payload);
}

function GetOrderStatus(order_id)
{
  var payload = {
    'request' : "/v1/order/status",
    'nonce' : Date.now().toString(),
    'order_id' : Number(order_id)
  };

  return SendRequest("/v1/order/status", payload);
}

function GetActiveOrders()
{
  var payload = {
    'request' : "/v1/orders",
    'nonce' : Date.now().toString()
  };
  return SendRequest("/v1/orders", payload);
}

function GetActualSymbolPrice(symbol)
{
  var request = "https://api.bitfinex.com/v1/pubticker/" + symbol;
  return UrlFetchApp.fetch((request), {'muteHttpExceptions': true});
}

function CancelOrder(OrderId)
{
  var payload = {
    'request': '/v1/order/cancel',
    'nonce': Date.now().toString(),
    'order_id': OrderId
  }

  SendRequest('/v1/order/cancel', payload);
}

function CancelMultipleOrders(IdList)
{
  var payload = {
    'request': '/v1/order/cancel/multi',
    'nonce': Date.now().toString(),
    'order_ids': IdList
  }

  SendRequest('/v1/order/cancel/multi', payload);
}

function SendRequest (apiRequest, payload)
{
  var apiURL = "https://api.bitfinex.com";

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

  return JSON.parse(reponse.getContentText());
}
