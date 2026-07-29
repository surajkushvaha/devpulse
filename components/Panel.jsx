'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

// Deterministic widths so the server and client render identical skeletons
// (Math.random() here would trip a hydration mismatch).
const SKELETON_WIDTHS = ['72%', '60%', '80%', '56%', '76%', '64%', '84%', '58%'];

function Thumb({ url, letter }) {
  const [failed, setFailed] = useState(false);
  const showImg = url && !failed;
  return (
    <div className={'thumb' + (showImg ? '' : ' thumb-empty')}>
      {showImg && <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />}
      <span className="thumb-fallback">{letter}</span>
    </div>
  );
}

function Card({ card }) {
  const cells = card.meta.filter(Boolean);
  return (
    <a className="card" href={card.href} target="_blank" rel="noopener noreferrer">
      <Thumb url={card.img} letter={card.letter} />
      <div className="card-body">
        <div className="item-title">
          {card.badge && (
            <>
              <span className="free-tag">{card.badge}</span>
              {' — '}
            </>
          )}
          {card.title}
        </div>
        <div className="item-meta">
          {cells.map((t, i) => (
            <Fragment key={i}>
              <span>{t}</span>
              {i < cells.length - 1 && <span className="sep">·</span>}
            </Fragment>
          ))}
        </div>
      </div>
    </a>
  );
}

export default function Panel({ source, registerReload, onSync }) {
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [errMsg, setErrMsg] = useState('');
  const [via, setVia] = useState(null);
  const [filter, setFilter] = useState(source.pills ? source.pills.initial : null);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const pagerRef = useRef(null);
  const doneRef = useRef(false);
  const busyRef = useRef(false);
  const countRef = useRef(0);
  const reqRef = useRef(0);
  const filterRef = useRef(filter);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  // Pulls one batch and appends it. `myReq` tags the load so a refresh started
  // mid-flight discards whatever the previous one was still fetching.
  const loadMore = useCallback(
    async (first, myReq) => {
      if (busyRef.current || doneRef.current || myReq !== reqRef.current || !pagerRef.current) return;
      busyRef.current = true;
      let batch;
      try {
        batch = await pagerRef.current();
      } catch (e) {
        doneRef.current = true;
        busyRef.current = false;
        if (first && myReq === reqRef.current) {
          setErrMsg(e.message);
          setStatus('error');
        }
        return;
      }
      if (myReq !== reqRef.current) {
        busyRef.current = false;
        return;
      }
      if (batch.length) {
        countRef.current += batch.length;
        const mapped = batch.map(source.toCard);
        setCards((prev) => prev.concat(mapped));
        setStatus('ready');
      } else {
        doneRef.current = true;
        if (countRef.current === 0) setStatus('empty');
      }
      busyRef.current = false;
    },
    [source]
  );

  const reload = useCallback(async () => {
    const myReq = ++reqRef.current;
    busyRef.current = false;
    doneRef.current = false;
    countRef.current = 0;
    pagerRef.current = null;
    setCards([]);
    setVia(null);
    setErrMsg('');
    setStatus('loading');
    try {
      const ctx = {
        setVia: (v) => {
          if (myReq === reqRef.current) setVia(v);
        }
      };
      const next = await source.start(ctx, filterRef.current);
      if (myReq !== reqRef.current) return;
      pagerRef.current = next;
      await loadMore(true, myReq);
    } catch (e) {
      if (myReq === reqRef.current) {
        setErrMsg(e.message);
        setStatus('error');
      }
    }
  }, [source, loadMore]);

  // Register with the page so "refresh all" can drive every panel at once.
  // The page fires the initial load, so the panel doesn't self-load on mount.
  useEffect(() => {
    registerReload(source.key, reload);
    return () => registerReload(source.key, null);
  }, [registerReload, source.key, reload]);

  // Reload when a filter chip changes (skipping the initial mount).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    reload();
    onSync();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Near-bottom paging: observe a sentinel inside the scroll container.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore(false, reqRef.current);
      },
      { root, rootMargin: '150px' }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore]);

  // A panel too short to scroll can never trigger the sentinel, so keep topping
  // it up until it overflows. Runs after each render, when scrollHeight is real.
  useEffect(() => {
    if (status !== 'ready' || doneRef.current || busyRef.current) return;
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight) loadMore(false, reqRef.current);
  }, [cards, status, loadMore]);

  return (
    <section className={'panel' + (source.wide ? ' wide' : '')}>
      <div className="panel-core">
        <div className="panel-head">
          <div className="panel-title">
            <span className="eyebrow-tag">{source.eyebrow}</span>
            <h2>{source.title}</h2>
          </div>
          <div className="panel-tools">
            {source.badge && via && <span className="panel-src">{via}</span>}
            <button
              className="panel-refresh"
              title="Refresh"
              onClick={() => {
                reload();
                onSync();
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {source.pills && (
          <div className="pill-row">
            {source.pills.options.map((opt) => (
              <button
                key={opt.value}
                className={'pill' + (opt.value === filter ? ' active' : '')}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="panel-body" ref={scrollRef}>
          {status === 'loading' &&
            Array.from({ length: source.skeletonRows || 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length] }} />
            ))}

          {status === 'error' && (
            <div className="error">
              Could not load {source.title} ({errMsg}).
              <br />
              <a href={source.error.href} target="_blank" rel="noopener noreferrer">
                {source.error.label} →
              </a>
            </div>
          )}

          {status === 'empty' && <div className="empty">{source.emptyMessage || 'Nothing to show.'}</div>}

          {cards.map((c, i) => (
            <Card key={i + '-' + c.href} card={c} />
          ))}

          <div className="sentinel" ref={sentinelRef} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
