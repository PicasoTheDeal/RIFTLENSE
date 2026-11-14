<script>
  import { grade } from '../lib/analog.js';
  let { selected, card, loading, data, against } = $props();
</script>

<section class="card">
  <div class="head">
    <div>
      <div class="tag">{selected.country || 'clicked point'}{selected.region ? ' / ' + selected.region : ''}</div>
      <p class="name">{selected.name}</p>
      {#if selected.note}<p class="small muted">{selected.note}</p>{/if}
    </div>
    {#if card?.total != null}
      <div class="score"><span class="big">{Math.round(card.total * 100)}</span><span class="tag">{grade(card.total)}</span></div>
    {/if}
  </div>
  <p class="tag">against {against}</p>

  {#if loading}
    <p class="tag">Fetching NASA POWER and elevation</p>
  {:else if card}
    {#if data}
      <dl class="facts">
        {#if data.t != null}<div><dt class="tag">mean</dt><dd>{data.t.toFixed(1)} C</dd></div>{/if}
        {#if data.tMin != null}<div><dt class="tag">range</dt><dd>{data.tMin.toFixed(0)} to {data.tMax.toFixed(0)} C</dd></div>{/if}
        {#if data.precipMmYr != null}<div><dt class="tag">rain</dt><dd>{Math.round(data.precipMmYr)} mm</dd></div>{/if}
        {#if data.elevation != null}<div><dt class="tag">elev.</dt><dd>{Math.round(data.elevation)} m</dd></div>{/if}
      </dl>
    {/if}
    <ul>
      {#each card.parts as p (p.key || p.opt)}
        <li>
          <div class="line"><span>{p.label}</span><span class="v">{Math.round(p.score * 100)}</span></div>
          <div class="bar"><span style="width:{Math.round(p.score * 100)}%"></span></div>
          {#if p.reason}<div class="small muted">{p.reason}</div>{/if}
        </li>
      {/each}
    </ul>
    {#if !selected.tags}<p class="note muted">Geology is only scored for listed sites, where it is known.</p>{/if}
    {#if card.limits}
      <h3>Where the analogy breaks</h3>
      <ul class="plain">{#each card.limits as l}<li class="small">{l}</li>{/each}</ul>
    {/if}
  {/if}
</section>

<style>
  .card { border-top: 1px solid var(--ink); padding-top: 12px; margin: 16px 0; }
  .head { display: flex; justify-content: space-between; gap: 12px; }
  .name { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
  .score { text-align: right; display: flex; flex-direction: column; }
  .big { font-size: 46px; line-height: 0.9; font-weight: 500; letter-spacing: -0.03em; }
  .facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 12px 0; }
  .facts div { border-left: 1px solid var(--rule); padding-left: 6px; }
  dd { margin: 0; font-family: var(--mono); font-size: 12px; }
  ul { list-style: none; padding: 0; margin: 10px 0 0; }
  li { margin-bottom: 11px; }
  .line { display: flex; justify-content: space-between; font-size: 13px; }
  .v { font-family: var(--mono); }
  .bar { height: 2px; background: var(--rule); margin: 4px 0; }
  .bar span { display: block; height: 100%; background: var(--ink); }
  .plain li { margin: 4px 0; }
</style>
