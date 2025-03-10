export interface DexTrade {
    Block: { Time: string };
    Trade: {
      Buy: {
        PriceInUSD: number;
        Currency: { Name: string; Symbol: string; MintAddress: string };
      };
      Sell: {
        Currency: { Name: string; Symbol: string; MintAddress: string };
      };
      Dex: { ProtocolName: string };
    };
  }  