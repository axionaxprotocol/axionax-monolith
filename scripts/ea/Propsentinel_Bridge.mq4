//+------------------------------------------------------------------+
//|                                           Propsentinel_Bridge.mq4|
//|                                                Axionax Foundation|
//|                                      https://github.com/axionax |
//+------------------------------------------------------------------+
#property copyright "Axionax Foundation"
#property link      "https://github.com/axionax"
#property version   "1.00"
#property strict

//--- Input parameters
input string   InpApiKey = "dev_secret_key_123"; // API Key
input string   InpApiUrl = "http://localhost:8100/api/v1/telemetry"; // API Endpoint URL
input int      InpUpdateIntervalMs = 1000; // Update Interval (ms)

int timerCounter = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   // Timer setup for Millisecond resolution
   EventSetMillisecondTimer(InpUpdateIntervalMs);
   Print("Propsentinel Bridge Initialized. Monitoring account: ", AccountNumber());
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("Propsentinel Bridge Stopped.");
  }

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
  {
   // We mainly rely on OnTimer, but can also trigger on tick for fast markets
  }

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
  {
   SendTelemetry();
  }

//+------------------------------------------------------------------+
//| Send Telemetry Data                                              |
//+------------------------------------------------------------------+
void SendTelemetry()
  {
   // Build JSON payload manually (MQL4 lacks native JSON)
   string account = IntegerToString(AccountNumber());
   string equity = DoubleToString(AccountEquity(), 2);
   string balance = DoubleToString(AccountBalance(), 2);
   string margin = DoubleToString(AccountMargin(), 2);
   string freeMargin = DoubleToString(AccountFreeMargin(), 2);
   string floatingPl = DoubleToString(AccountEquity() - AccountBalance(), 2);
   
   // Gather open positions
   int totalOrders = OrdersTotal();
   string positionsJson = "[";
   int openCount = 0;
   
   for(int i=0; i<totalOrders; i++)
     {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
         if(OrderType() <= OP_SELL) // Only market orders
           {
            if(openCount > 0) positionsJson += ",";
            
            string typeStr = (OrderType() == OP_BUY) ? "BUY" : "SELL";
            string ticket = IntegerToString(OrderTicket());
            string symbol = OrderSymbol();
            string lots = DoubleToString(OrderLots(), 2);
            string openPrice = DoubleToString(OrderOpenPrice(), 5);
            string currentPrice = DoubleToString((OrderType() == OP_BUY) ? MarketInfo(symbol, MODE_BID) : MarketInfo(symbol, MODE_ASK), 5);
            string profit = DoubleToString(OrderProfit(), 2);
            
            positionsJson += "{";
            positionsJson += "\"ticket\":\"" + ticket + "\",";
            positionsJson += "\"symbol\":\"" + symbol + "\",";
            positionsJson += "\"type\":\"" + typeStr + "\",";
            positionsJson += "\"volume\":" + lots + ",";
            positionsJson += "\"open_price\":" + openPrice + ",";
            positionsJson += "\"current_price\":" + currentPrice + ",";
            positionsJson += "\"profit\":" + profit;
            positionsJson += "}";
            
            openCount++;
           }
        }
     }
   positionsJson += "]";

   // Construct full payload
   string payload = "{";
   
   // Auth
   payload += "\"auth\":{\"account_number\":\"" + account + "\"},";
   
   // Meta
   timerCounter++;
   payload += "\"meta\":{\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\",\"seq\":" + IntegerToString(timerCounter) + "},";
   
   // Terminal
   payload += "\"terminal\":{\"terminal_id\":\"MT4-" + account + "\",\"platform\":\"mt4\"},";
   
   // Portfolio
   payload += "\"portfolio\":{";
   payload += "\"equity\":" + equity + ",";
   payload += "\"balance\":" + balance + ",";
   payload += "\"margin\":" + margin + ",";
   payload += "\"free_margin\":" + freeMargin + ",";
   payload += "\"floating_pl\":" + floatingPl + ",";
   payload += "\"open_positions\":" + positionsJson;
   payload += "}";
   
   payload += "}";

   // HTTP POST
   char postData[];
   char result[];
   string resultHeaders;
   int res;
   
   StringToCharArray(payload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   string headers = "Content-Type: application/json\r\n";
   headers += "X-API-Key: " + InpApiKey + "\r\n";
   
   res = WebRequest("POST", InpApiUrl, headers, 5000, postData, result, resultHeaders);
   
   if(res == 200) {
      // Success, check if kill switch was triggered (if API responds with kill instruction)
   } else {
      Print("Telemetry failed. Error: ", GetLastError(), " HTTP Code: ", res);
   }
  }
