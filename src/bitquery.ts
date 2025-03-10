import { BITQUERY_API_KEY, BITQUERY_ENDPOINT, SOLANA_DEX_PROGRAM } from "./config";
import { DexTrade } from "./types";

export const fetchNewTokens = async (): Promise<DexTrade[]> => {
  const query = JSON.stringify({
    query: `query { Solana { DEXTrades( orderBy: {descending: Block_Time} limit: {count: 50} where: { Block: {Time: {since: "2025-03-10T15:10:06Z"}}, Transaction: {Result: {Success: true}}, Trade: { Dex: { ProgramAddress: {is: "${SOLANA_DEX_PROGRAM}"} } } } limitBy: {by: Trade_Buy_Currency_MintAddress, count: 1} ) { Block { Time } Trade { Buy { PriceInUSD Currency { Name Symbol MintAddress } } Sell { Currency { Name Symbol MintAddress } } Dex { ProtocolName } } } } }`
  });

  const response = await fetch(BITQUERY_ENDPOINT, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": BITQUERY_API_KEY,
    },
    body: query,
  });

  const data = await response.json();
  return data?.data?.Solana?.DEXTrades || [];
};
