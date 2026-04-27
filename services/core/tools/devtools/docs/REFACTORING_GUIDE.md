# Axionax Protocol - Refactoring & Code Quality Tools

Tools for refactoring and improving code quality across the entire Axionax Protocol

## 📚 Available Scripts

### 1. 🏥 `check_repo_health.py` - Repository Health Checker
Checks the health of all repositories

**Usage:**
```bash
python check_repo_health.py
```

**Checks:**
- ✅ Whether .gitignore is complete
- ✅ Uncommitted files
- ✅ package-lock.json
- ✅ dependency versions
- ✅ README.md

---

### 2. 🔗 `test_repo_links.py` - Repository Link Tester
Tests links between repositories

**Usage:**
```bash
python test_repo_links.py
```

**Checks:**
- ✅ Whether file: links are correct
- ✅ Dependencies between repos
- ✅ Import resolution
- ❌ Should not use workspace: protocol
- ❌ Should not link through contributors

---

### 3. 🔍 `analyze_code_quality.py` - Code Quality Analyzer
Detailed code quality analysis

**Usage:**
```bash
python analyze_code_quality.py
```

**Analyzes:**

#### TypeScript/JavaScript:
- ⚠️ Functions too long (>50 lines)
- ⚠️ Magic numbers
- ⚠️ Nested if statements (>3 levels)
- ⚠️ TODO/FIXME comments
- ⚠️ Commented code
- ⚠️ `any` types
- ⚠️ Empty catch blocks

#### Rust:
- ⚠️ Excessive `.unwrap()` and `.expect()`
- ⚠️ Excessive `.clone()`
- ⚠️ `unsafe` blocks
- ⚠️ Public items without documentation
- ⚠️ TODO/FIXME comments

---

### 4. 🧹 `refactor_and_clean.py` - Refactor & Clean Tool
Automated code cleaning and refactoring

**Usage:**
```bash
# Run full refactor
python refactor_and_clean.py

# Skip formatting
python refactor_and_clean.py --skip-formatting

# Skip linting
python refactor_and_clean.py --skip-linting

# Refactor specific repo
python refactor_and_clean.py --repo axionax-core
```

**Actions:**

#### All Repos:
1. ✅ Create/update .gitignore
2. ✅ Detect unused files
3. ✅ Check documentation

#### TypeScript Repos:
1. ✅ Remove leftover `console.log()`
2. ✅ Remove `debugger` statements
3. ✅ Remove duplicate empty lines
4. ✅ Remove trailing whitespace
5. ✅ Run Prettier (if available)
6. ✅ Run ESLint --fix (if available)

#### Rust Repos:
1. ✅ Remove duplicate empty lines
2. ✅ Remove trailing whitespace
3. ✅ Run rustfmt
4. ✅ Run clippy --fix

---

### 5. ✅ `test_repo_integration.py` - Integration Tester
Tests connectivity and readiness of all repos

**Usage:**
```bash
python test_repo_integration.py
```

**Tests:**
- ✅ Repository existence
- ✅ Git status
- ✅ Package/Cargo validation
- ✅ Dependencies
- ✅ Build system
- ✅ Import resolution

---

### 6. 🚀 `master_refactor.py` - Master Script
Runs all scripts in sequence with a single command

**Usage:**
```bash
python master_refactor.py
```

**Execution order:**
1. 📋 Health Check
2. 🔗 Link Testing
3. 🔍 Code Quality Analysis
4. 🧹 Refactor & Clean
5. ✅ Final Integration Test

---

## 🎯 Recommended Workflow

### For daily development:
```bash
# 1. Check health
python check_repo_health.py

# 2. Clean code
python refactor_and_clean.py

# 3. Test
python test_repo_integration.py
```

### For code quality improvement:
```bash
# 1. Analyze quality
python analyze_code_quality.py

# 2. Review found issues
# 3. Fix manually
# 4. Run refactor
python refactor_and_clean.py

# 5. Test again
python test_repo_integration.py
```

### For Full Refactor:
```bash
# Run everything at once
python master_refactor.py
```

---

## 📊 Expected Results

After running these scripts you will get:

1. **Clean Code:**
   - ✅ No console.log/debugger
   - ✅ No trailing whitespace
   - ✅ Consistent formatting
   - ✅ Fewer lint errors

2. **Correct .gitignore:**
   - ✅ All unwanted files ignored
   - ✅ Separated by repo type

3. **Clear Dependencies:**
   - ✅ Using file: links
   - ✅ Not linking through workspace
   - ✅ Resolvable across all repos

4. **Documentation:**
   - ✅ Complete README.md
   - ✅ Appropriate code comments
   - ✅ No stale TODOs

5. **Complete Reports:**
   - 📄 `REPO_LINK_TEST_REPORT.txt`
   - 📄 `INTEGRATION_TEST_REPORT.txt`
   - 📄 `integration_test_results.json`

---

## ⚙️ Configuration

### Prettier (TypeScript)
Create a `.prettierrc` file in the repo:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### ESLint (TypeScript)
Use the existing config in `package.json` or create `.eslintrc.json`

### rustfmt (Rust)
Create a `rustfmt.toml` file in the repo:
```toml
max_width = 100
hard_tabs = false
tab_spaces = 4
edition = "2021"
```

---

## 🚨 Warnings

1. **Backup before running:**
   ```bash
   git add -A
   git commit -m "backup before refactor"
   ```

2. **Review changes:**
   ```bash
   git diff
   ```

3. **Test after changes:**
   ```bash
   # TypeScript
   npm test
   npm run build
   
   # Rust
   cargo test
   cargo build
   ```

4. **Don't forget to commit:**
   ```bash
   git add -A
   git commit -m "refactor: improve code quality"
   git push
   ```

---

## 🤝 Contributing

If you find issues or want to add features:

1. Fork repository
2. Create a new branch
3. Make changes
4. Run `python master_refactor.py`
5. Submit Pull Request

---

## 📝 License

MIT License - see LICENSE file

---

## 🎉 Happy Refactoring!

Made with ❤️ for Axionax Protocol
