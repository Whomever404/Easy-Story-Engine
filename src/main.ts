import { WebEditor } from './editor/WebEditor';
import { sampleProjectData } from './demo/sampleProject';

function init() {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.innerHTML = '';
    new WebEditor(appContainer, sampleProjectData);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
