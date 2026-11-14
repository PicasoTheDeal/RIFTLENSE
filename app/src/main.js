import { mount } from 'svelte';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './app.css';
import App from './App.svelte';

setWorkerUrl(workerUrl);

mount(App, { target: document.getElementById('app') });
