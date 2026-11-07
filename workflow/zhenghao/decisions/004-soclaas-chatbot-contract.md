# SoCLaaS chatbot contract checkpoint

Verified on 7 November 2026 against the public
[API reference](https://soclaas-api.comp.nus.edu.sg/) and its
[OpenAPI document](https://soclaas-api.comp.nus.edu.sg/openapi.json).

The documented chat endpoint is `/v1/chat/completions`, authenticated with Bearer
credentials. `model` and `messages` are required; non-streamed replies use the
choices/message envelope. Optional usage includes prompt/completion/total tokens.
Optional fields and capabilities depend on the selected model.

Decision: retain the established backend transport envelope, configured model,
and non-streaming scope. This confirms basic protocol documentation, not actual
configured-model compatibility or coaching quality. Those require separately
recorded synthetic live evidence. The original DocHub quickstart remains
login-protected. This checkpoint supplements the approved plan without changing
its bytes, scope or permissions.
