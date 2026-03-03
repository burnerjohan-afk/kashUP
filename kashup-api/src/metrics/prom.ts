import client from 'prom-client';

client.collectDefaultMetrics();

export const register = client.register;

export const transactionCounter = new client.Counter({
  name: 'kashup_transactions_total',
  help: 'Nombre total de transactions traitées'
});

export const boostPurchaseCounter = new client.Counter({
  name: 'kashup_boost_purchases_total',
  help: 'Nombre total de boosts achetés'
});


