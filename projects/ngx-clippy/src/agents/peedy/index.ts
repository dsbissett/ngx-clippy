import { from, of } from 'rxjs';

const Peedy = {
  agent: () => from(import("./agent")),
  sound: () => from(import("./sounds-ogg")),
  map: () => of(new URL('./map.avif', import.meta.url).href),
};
export default Peedy;
