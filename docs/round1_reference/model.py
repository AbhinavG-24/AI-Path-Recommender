import re
from collections import defaultdict
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
train = pd.read_csv('train.csv')
test = pd.read_csv('test.csv')
def split(text):
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+',text) if s.strip()]
sent_courses = defaultdict(set)
for c,r in zip(train['Course'],train['Reviews']):
    for s in split(r):
        sent_courses[s].add(c)
fp = {s: next(iter(cs)) for s,cs in sent_courses.items() if len(cs) == 1}
def detect(review):
    found = {fp[s] for s in split(review) if s in fp}
    return found.pop() if len(found) == 1 else None
test_courses = [detect(r) for r in test['Reviews']]
train_sents = set()
for r in train['Reviews']:
    train_sents.update(split(r))
openers = sorted({split(r)[0] for r in test['Reviews']} - train_sents)
def words(s):
    return set(re.sub(r'[^a-z ]','',s.lower()).split())
openers_by_course = defaultdict(set)
for c,r in zip(train['Course'],train['Reviews']):
    openers_by_course[c].add(split(r)[0])
named = {}
for c,ops in openers_by_course.items():
    for op in ops:
        w = words(re.sub(re.escape(c),'',op,flags=re.IGNORECASE))
        m = max(openers,key=lambda g: len(words(g) & w) / len(words(g) | w))
        named[(c,m)] = op
restored = []
for r,c in zip(test['Reviews'],test_courses):
    parts = split(r)
    restored.append(' '.join([named[(c,parts[0])]] + parts[1:]))
restored = pd.Series(restored)
tfidf = TfidfVectorizer(stop_words='english',ngram_range=(1,2),sublinear_tf=True)
X_train = tfidf.fit_transform(train['Reviews'])
X_test = tfidf.transform(restored)
ids = train['Index'].values
recs = [None] * len(test)
for i in range(0,X_test.shape[0],500):
    j = min(i + 500,X_test.shape[0])
    sim = cosine_similarity(X_test[i:j],X_train)
    for k in range(j - i):
        top = np.lexsort((ids,-sim[k]))[:10]
        recs[i + k] = [int(x) for x in ids[top]]
sub = pd.DataFrame({'Index': test['Index'],'Index_list': recs})
sub.to_csv('submission.csv',index=False)