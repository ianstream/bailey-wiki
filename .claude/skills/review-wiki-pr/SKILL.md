# review-wiki-pr 스킬

PR 링크를 전달받아 wiki 문서에 달린 코드리뷰 코멘트를 분석하고, 규칙에 따라 자동 대응한다.

## 사용법

```
/review-wiki-pr <PR URL 또는 PR 번호>
```

## 실행 단계

### 1단계: PR 코멘트 수집

```bash
# 인라인 코멘트 (wiki/ 파일만 필터링)
gh api repos/{owner}/{repo}/pulls/$PR_NUMBER/comments?per_page=100 | python3 -c "
import json,sys
data = json.load(sys.stdin)
originals = [c for c in data if not c.get('in_reply_to_id') and c.get('path','').startswith('wiki/')]
print(f'원본 코멘트: {len(originals)}')
"

# 2페이지 이상인 경우 page=2, page=3 등 추가로 수집
gh api "repos/{owner}/{repo}/pulls/$PR_NUMBER/comments?per_page=100&page=2"
```

- `in_reply_to_id`가 없는 원본 코멘트만 처리 (reply는 제외)
- wiki 경로(`wiki/`) 하위 마크다운 파일에 달린 코멘트만 필터링
- 이미 처리한 코멘트 ID 목록을 관리하여 중복 처리 방지

### 2단계: 코멘트 분류

각 코멘트를 아래 4가지 유형으로 분류한다:

| 유형 | 판단 기준 | 대응 방식 |
|------|----------|----------|
| **A. 문법 오류** | 마크다운 문법 오류, 오탈자, 형식 문제 지적 | 문서 수정 + 원본 코멘트에 reply |
| **B. 내용 불일치** | 문서 내용이 실제 코드와 다르다는 지적 | 코드 기준으로 문서 수정 + 원본 코멘트에 reply |
| **C. 코드 이슈** | wiki 문서가 아닌 원본 코드의 버그/개선점 지적 | GitHub Issue 직접 등록 + 원본 코멘트에 이슈 링크 reply |
| **D. 기타** | 위 세 가지에 해당하지 않는 코멘트 | 사용자에게 처리 방향 안내 요청 |

**분류 판단 기준:**
- 오탈자/형식 지적이라도 실제 소스 코드와 일치하면 → C유형 (코드 자체의 문제)
- 코드 개선 제안(as any, blur() 등)이라도 wiki가 코드를 정확히 반영 중이면 → C유형
- 문서 설명이 실제 코드 동작과 다른 경우만 → B유형

### 3단계: 유형별 대응

**중요**: 모든 대응은 사용자 승인 없이 즉시 실행한다.

#### A. 문법 오류 대응

1. 해당 wiki 마크다운 파일 Read
2. 문법 오류 수정 (Edit)
3. 커밋 & Push (4단계)
4. **원본 코멘트에 reply** (`/replies` 엔드포인트 사용):

```bash
gh api repos/{owner}/{repo}/pulls/180/comments/{comment_id}/replies \
  --method POST \
  --field body="문법 오류를 수정했습니다.

**수정 내용**: {구체적인 수정 내용}
**파일**: {wiki 파일 경로}
**커밋**: \`{commit_hash}\`"
```

#### B. 내용 불일치 대응

1. 지적된 wiki 파일과 대응하는 소스 코드 파일 Read
2. 코드 내용 기준으로 wiki 문서 수정 (Edit)
3. 커밋 & Push (4단계)
4. **원본 코멘트에 reply**:

```bash
gh api repos/{owner}/{repo}/pulls/180/comments/{comment_id}/replies \
  --method POST \
  --field body="코드 내용을 기준으로 문서를 수정했습니다.

**수정 내용**: {구체적인 수정 내용}
**기준 소스**: {소스 파일 경로}
**wiki 파일**: {wiki 파일 경로}
**커밋**: \`{commit_hash}\`"
```

#### C. 코드 이슈 대응

1. **GitHub Issue 직접 등록**:

```bash
ISSUE_URL=$(gh issue create \
  --repo {owner}/{repo} \
  --title "{이슈 제목}" \
  --body "## 발견 경위
PR #{PR_NUMBER} 코드리뷰에서 발견된 원본 코드 이슈입니다.
원본 리뷰 코멘트: {comment_url}

## 문제 설명
{코멘트 내용 요약}

## 관련 파일
\`{소스 파일 경로}\`" \
  --label "bug" \
  | tail -1)
echo $ISSUE_URL
```

2. **원본 코멘트에 이슈 링크 reply**:

```bash
gh api repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments/{comment_id}/replies \
  --method POST \
  --field body="원본 코드의 이슈로 판단하여 GitHub Issue를 등록했습니다.

**등록된 이슈**: {ISSUE_URL}
**관련 파일**: \`{소스 파일 경로}\`"
```

여러 건을 처리할 때는 각 코멘트마다 위 절차를 반복한다 (이슈는 건별로 별도 등록).

#### D. 기타

사용자에게 직접 처리 방향 안내:

```
아래 코멘트는 자동 분류가 어렵습니다. 처리 방향을 알려주세요.

**코멘트 내용**: {코멘트 원문}
**파일**: {파일 경로}

처리 옵션:
1. 문서 수정 필요 → 구체적인 수정 방향 알려주세요
2. 무시 → "무시"라고 답해주세요
3. 이슈 등록 → "이슈"라고 답해주세요
```

### 4단계: 변경 파일 커밋 및 Push

문서 수정이 있었던 경우 (A/B 유형):

```bash
git add wiki/
git commit -m "docs: wiki 문서 리뷰 반영 (PR #${PR_NUMBER})"
git push
# 커밋 해시 확인
git log --oneline -1
```

### 5단계: 중복 reply 검증

reply 완료 후 중복 여부 확인:

```bash
gh api "repos/{owner}/{repo}/pulls/$PR_NUMBER/comments?per_page=100" | python3 -c "
import json,sys
from collections import defaultdict
data = json.load(sys.stdin)
reply_map = defaultdict(list)
for c in data:
    rid = c.get('in_reply_to_id')
    if rid in target_ids:
        reply_map[rid].append(c['id'])
dups = {k:v for k,v in reply_map.items() if len(v)>1}
if dups: print('중복:', dups)
missing = target_ids - set(reply_map.keys())
if missing: print('미처리:', missing)
else: print('모두 완료!')
"
```

중복 발견 시 두 번째 이후 reply 삭제:

```bash
gh api repos/{owner}/{repo}/pulls/comments/{duplicate_id} --method DELETE
```

### 6단계: 처리 결과 요약 출력

```
## wiki PR 리뷰 대응 완료

| 유형 | 건수 |
|------|------|
| A. 문법 오류 수정 | N건 |
| B. 내용 불일치 수정 | N건 |
| C. 코드 이슈 → 이슈 직접 등록 | N건 |
| D. 기타 → 사용자 확인 필요 | N건 |

수정된 파일: N개
커밋: `{hash}`
```

## 주의사항

- wiki 경로(`wiki/`) 하위 파일에 달린 코멘트만 처리
- `in_reply_to_id`가 있는 reply 코멘트는 원본이 아니므로 처리 대상 제외
- 코드 이슈는 직접 수정하지 않고 GitHub Issue를 등록한 뒤 이슈 링크를 reply로 달아야 한다
- 내용 불일치 판단 시 항상 소스 코드가 기준 (wiki 문서가 아님)
- D 유형은 자동 처리하지 않고 반드시 사용자에게 확인 요청
- 모든 대응은 사용자 승인 없이 즉시 실행한다
- reply는 반드시 `pulls/180/comments/{id}/replies` 엔드포인트를 사용한다 (`pulls/comments/{id}/replies`와 다름)
- 코멘트가 100건 초과 시 페이지네이션(`page=2`, `page=3`) 처리 필요
- reply 후 반드시 중복 여부 검증 (5단계)
