-- Optional dev seed: 3 real StonkFun mints with invented balances.
-- Prices refresh on the first /api/cron/prices run.
insert into listings (mint, pool, name, symbol, image_url, quote_mint, quote_symbol, quote_category, quote_label, quote_decimals, mode, transfer_fee_bps, status, graduated_at, created_on_stonkfun, tagline, category, balance, price_usd, first_deposit_at, last_deposit_at)
values
 ('8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS','GeNDy5afAWz7S9w2tMLgpK3xQqXjeDaCvYV9h8joEmjo','KNOTS','KNOTS','https://gateway.irys.xyz/3KNgu99JvZ961wXUxcZ8LXDXjaWK4651Wo9oUZSA5U4L','6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx','STONK','custom','Custom',6,'reward',300,'graduated','2026-09-06T14:47:58Z','2026-09-05T16:34:45Z','tie yourself to the stonk.','custom',410000,0.0423,now()-interval '4 days',now()-interval '3 hours'),
 ('6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx','7a8xxAJBELDo6P9dikSYctdw6ce8F4mWr3ahcAD8Ao49','STONK','STONK','https://www.stonkfun.xyz/api/asset/quote-logo/6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx?v=c3c81410','XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W','SPYX','xstock','xStock',8,'standard',null,'graduated','2026-07-23T19:24:05Z','2026-07-23T19:08:03Z','the OG. paired with the S&P 500.','xstock',48000,0.3168,now()-interval '6 days',now()-interval '1 day'),
 ('HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR','BTccxxTFi7a9xJTE1exKn38Jgie35s6gNeRxd8DM61Rc','Anonymous Cat','ZCAT','https://gateway.irys.xyz/7uFsXwyuyzKDiqdda4L2cq3DcpcdRqYhwe4m8ZoVJ1BQ','A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS','ZEC','custom','Custom',8,'reward',300,'graduated','2026-08-30T23:59:36Z','2026-08-30T23:30:26Z','shielded cat. dividends in ZEC.','custom',120000,0.0824,now()-interval '8 days',now()-interval '2 days')
on conflict (mint) do nothing;

insert into activity (kind, mint, wallet, amount, usd, created_at) values
 ('listed','8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS',null,null,null,now()-interval '4 days'),
 ('listed','6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx',null,null,null,now()-interval '6 days'),
 ('listed','HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR',null,null,null,now()-interval '8 days');
