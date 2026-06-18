export type DonationMethod = {
  id: "btc" | "eth" | "usdt_trx";
  symbol: string;
  network: string;
  label: string;
  address: string;
};

export const DONATION_METHODS: DonationMethod[] = [
  {
    id: "btc",
    symbol: "BTC",
    network: "Bitcoin",
    label: "Bitcoin",
    address: "",
  },
  {
    id: "eth",
    symbol: "ETH",
    network: "Ethereum",
    label: "Ethereum",
    address: "",
  },
  {
    id: "usdt_trx",
    symbol: "USDT",
    network: "TRON (TRC20)",
    label: "USDT (TRX)",
    address: "",
  },
];
