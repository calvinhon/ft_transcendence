import { qs } from '../src/ui-view';

describe('qs', () => {
  beforeAll(() => {
    document.body.innerHTML = `
      <div id="test1"></div>
      <span class="test2"></span>
    `;
  });
  it('returns element by selector', () => {
    expect(qs('#test1')).not.toBeNull();
    expect(qs('.test2')).not.toBeNull();
    expect(qs('.notfound')).toBeNull();
  });
});
