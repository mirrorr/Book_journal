import type { BookInput } from '../types';

/**
 * Real-world sample data used to initialize an empty data store,
 * in both Local (LocalStorage) and Supabase modes.
 */
export const SEED_BOOKS: BookInput[] = [
  {
    kirjan_nimi: 'Juurihoito',
    kirjoittaja: 'Miika Nousiainen',
    valmistumispaiva: '2026-05-02',
    arvio: 4,
    yhteenveto:
      'Hauska tarina ja seikkailu miehestä, joka haluaa löytää isänsä, joka karkasi hänen ollessaan 3v. ' +
      'Päähenkilö löytää ensin veljensä Suomesta, sitten sisarensa Ruotsista, toisen sisarensa Thaimaasta ' +
      'ja lopuksi kolmannen sisarensa Australiasta, missä tarina päättyy, kun kaikki saavat tietää isänsä ' +
      'kuolemasta pari vuotta sitten.',
    tarkein_oppi:
      'Isillä oli erilaisia syitä jättää lapsensa, kun he olivat pieni, ja on hyvä yrittää ymmärtää ' +
      'vanhempiesi syitä eikä tuomita heitä liian ankarasti',
    mista_pidin:
      'eri hahmot hauskat tapaat ja niiden vuorovaikutus, kaksi veli oli erilainen mutta he kannustaa ja auttaa toisiaan',
    mista_en_pitanyt: 'jonkin verran kiroiluja ja epäkunniosta',
    lempilainaus: 'Rakkaudella ei ole loppua, ainoastaan alku',
    omat_ajatukset: 'Se es hyvää yrittää ymmärtää vanhemman lisää ja olla kiitollinen heille',
    suosittelen: true,
    suosittelu_syy: 'helppo ja erittäin hauska lukea',
  },
];
