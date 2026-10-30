---
name: agentfeed-briefs
description: Use when an agent needs a short crypto market brief or a perp signal: what changed overnight in BTC, ETH, SOL and HYPE with the one level to watch, which Hyperliquid perps moved unusually, whether funding, liquidations or open interest are abnormal right now, or the signal board and coin signals. Calls AgentFeed over HTTP. Scheduled or unattended runs send one flat signals pass (or a prepaid key) from the AGENTFEED_KEY environment variable, so no payment prompt is needed; attended runs can pay per call with x402. Describes what moved, never what to trade.
license: MIT-0
compatibility: Needs outbound HTTPS to the AgentFeed host and a way to send an HTTP header (curl or any HTTP client). Per-call payment needs an x402 client; scheduled runs need only an environment variable.
metadata:
  author: seekdaseek
  version: "{{package_version}}"
  openclaw:
    homepage: "{{origin}}"
    primaryEnv: AGENTFEED_KEY
    requires:
      bins:
        - curl
    envVars:
      - name: AGENTFEED_KEY
        required: false
        description: "A signals pass or prepaid key from AgentFeed (afk_...). Send it as the header X-AgentFeed-Key for unattended runs. Not needed when paying per call with x402."
  hermes:
    tags: [crypto, market-data, briefs, x402]
    category: finance
---

# AgentFeed briefs

{{count_words}} short briefs built only from data AgentFeed already collects, and the perp signal routes that sit beside them. Each one gives the judgment (what changed, why it matters, the one level to watch), not a raw number. The text is templates over numbers: no language model, nothing invented. It never says what to trade, and you should not turn it into a trade instruction.

Service: {{origin}}. Every route is a GET and returns JSON. The three briefs take no parameter; the signal routes take the optional ones listed in [references/ROUTES.md](references/ROUTES.md) and in `/openapi.json`.

## When to use which brief

<!-- generated:begin routes -->
{{routes_table}}
<!-- generated:end routes -->

Pick by the question:
{{questions}}

The same key also reads the perp signal routes (below), so a scheduled run can mix them under one flat price:

<!-- generated:begin signals -->
{{signals_table}}
<!-- generated:end signals -->

{{signal_questions}}

## Pay: choose by how you run

**Scheduled, cron or unattended (nobody can approve a payment):** use a key. A human or an attended agent buys it once, puts it in the environment variable `AGENTFEED_KEY`, and every call sends it as the header `X-AgentFeed-Key`:

```bash
curl -s -H "X-AgentFeed-Key: $AGENTFEED_KEY" {{origin}}{{first_route}}
```

There is no payment prompt, so a cron run cannot stall on one. Never print the key, never write it into a file you commit, never put it in a URL. If `AGENTFEED_KEY` is empty, stop and tell the user a key is needed; do not buy one yourself.

<!-- generated:begin passes -->
{{passes_text}}
<!-- generated:end passes -->

**Attended (a person or an x402 client is present):** call the route without a key. It answers 402 with the price in the `PAYMENT-REQUIRED` header (base64 JSON); pay it with any x402 client and repeat the request with a `PAYMENT-SIGNATURE` header. Buying a key or a pass is a payment: ask the user first.

## Try it free first

`{{origin}}/api/sample/<route>` returns the brief's real response shape for nothing, e.g. `{{origin}}{{first_sample}}`. The numbers in the three brief samples are generated, not market readings; use them to see the fields and the wording. The signal routes' samples are trimmed captures of real answers.

## Reading an answer

The body of every route is `{ "tool", "data", "paid" }`. For the three briefs `data` is:

- `headline`: one sentence, the most abnormal item. Quote it first.
- `items[]`: ranked by `abnormality` (1.0 means an item just meets its rule). Each has `what`, `why_it_matters`, `numbers`, `source`, `as_of` and, when one exists, `level_to_watch`.
- `sources[]`: every part used, with `as_of` and `age_s`.
- `stale_parts[]`: parts that were too old or missing. They are left out, never served as fresh. If this is not empty, say which parts are missing.
- `method`: the thresholds and the sample sizes. Read it before explaining a number.

Say plainly when `items` is empty: it is a real answer ("nothing past its rule"), and `checked` or `coins_checked` says what was looked at.

## Errors

- **503 with `Retry-After`:** the data behind the brief is stale or missing. You were not charged. Wait the number of seconds and retry once; do not loop.
- **429 with `retry_after`:** a pass answers each brief once per {{pace_s}} seconds. Wait, do not retry sooner. A 429 is not billed.
- **401/403 on a pass:** expired, or the key is for other routes. The body names the pass to buy again.
- **402 with a key:** the key has no balance (a prepaid pack) or you sent none.

## Scheduling

See [references/SCHEDULING.md](references/SCHEDULING.md) for a cron line, a Hermes Agent job and a Claude Code routine. Facts about the routes, prices and pass terms are in [references/ROUTES.md](references/ROUTES.md); they are generated from the AgentFeed code and change with it.
