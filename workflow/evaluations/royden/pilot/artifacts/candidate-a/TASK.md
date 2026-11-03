# Synthetic publication guard

Implement publicationEligibility in publication-guard.ts using its supplied types.
This synthetic task is authorized for local implementation and commits only.
Input shapes satisfy the TypeScript interfaces; transport parsing is out of scope.
Return errors in this precedence:
1. null actor -> UNAUTHENTICATED
2. non-INSTRUCTOR actor, or exercise owned by another instructor -> FORBIDDEN
3. exercise status other than DRAFT -> CONFLICT
4. hints not exactly three in array order with stages 1,2,3, each approved === true
   and content.trim() nonempty -> INVALID_HINTS
Otherwise return exactly {ok:true}. Errors are exactly {ok:false,code:<code>}.
Preserve inputs, perform no I/O, and expose only this public function and types.
Do not sort invalid input into validity. No Python execution or real provider use.
Use Node 24: node --test public.test.mjs [your additional .test.mjs files].
Write focused tests and a handoff with commands, results, limitations and commits.
Only your assigned fixture directory is in scope. No competing worktrees, product
repository, evaluator, hidden checks or private fixture data may be read.
