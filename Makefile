.PHONY: test test-lint test-schema test-selfcopy test-unit test-bdd bdd lint check-directives

test: test-lint test-schema test-selfcopy test-unit

lint: check-directives test-lint

check-directives:
	@if [ -d .lgtm/reviews ]; then \
		directives=$$(grep -rn "^#ref " .lgtm/reviews 2>/dev/null || true); \
		if [ -n "$$directives" ]; then \
			echo "ERROR: Unresolved LGTM directives in .lgtm/reviews/:" >&2; \
			echo "$$directives" >&2; \
			exit 1; \
		fi; \
	fi

test-lint:
	@sh tests/test_lint.sh

test-schema:
	@sh tests/test_schema.sh

test-selfcopy:
	@sh tests/test_selfcopy.sh

test-unit:
	@npm test

test-bdd:
	@sh tests/bdd/test_bdd.sh

bdd: test-bdd
