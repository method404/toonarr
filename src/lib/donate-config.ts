export type DonationMethod = {
  id: "btc" | "eth" | "usdt_trx";
  symbol: string;
  network: string;
  label: string;
  address: string;
  iconUrl: string;
};

export const DONATION_METHODS: DonationMethod[] = [
  {
    id: "btc",
    symbol: "BTC",
    network: "Bitcoin",
    label: "비트코인",
    address: "bc1qxl7gyypw6xcrtd8zxjlxdmmgj902tfmfqx00kf",
    iconUrl: "/donate/btc.png",
  },
  {
    id: "eth",
    symbol: "ETH",
    network: "Ethereum",
    label: "이더리움",
    address: "0x484De1E836468bF00dB4a4faFC9E877038e69B1F",
    iconUrl: "/donate/eth.png",
  },
  {
    id: "usdt_trx",
    symbol: "USDT",
    network: "TRON (TRC20)",
    label: "테더",
    address: "TRa4GyBTJEk3UNHSCL5L5nXBNjHLKN15bJ",
    iconUrl: "/donate/usdt.png",
  },
];
