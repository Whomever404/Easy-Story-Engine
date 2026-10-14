import { WebEditor } from './editor/WebEditor';
import { sampleProjectData } from './demo/sampleProject';

window.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    new WebEditor(appContainer, sampleProjectData);
  }
});
