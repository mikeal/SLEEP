clean:
	@$(RM) -fr node_modules $(STANDALONE).js
	@$(RM) -fr npm-debug.log

test: node_modules
	@node tests/run

node_modules: package.json
	@npm prune
	@npm install

.PHONY: clean test
