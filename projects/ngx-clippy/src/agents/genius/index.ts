import { from, of } from 'rxjs';

const Genius = {
  agent: () => from(import("./agent")),
  sound: () => from(import("./sounds-ogg")),
  map: () => of(new URL('./map.avif', import.meta.url).href),
};
export default Genius;
