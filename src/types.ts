/** A single reading-journal entry, mirroring the Finnish journal schema. */
export interface Book {
  id: string;
  /** Kirjan nimi */
  kirjan_nimi: string;
  /** Kirjoittaja */
  kirjoittaja: string;
  /** Päivä, jolloin sain kirjan valmiiksi (ISO date, e.g. "2026-05-02") */
  valmistumispaiva: string;
  /** Arvio 1–5 */
  arvio: number;
  /** Yhteenveto */
  yhteenveto: string;
  /** Tärkein ajatus / oppi */
  tarkein_oppi: string;
  /** Mistä pidin */
  mista_pidin: string;
  /** Mistä en pitänyt */
  mista_en_pitanyt: string;
  /** Lempilainaus */
  lempilainaus: string;
  /** Omat ajatukset (pohdinta) */
  omat_ajatukset: string;
  /** Suosittelisinko? */
  suosittelen: boolean;
  /** Miksi suosittelen / en suosittele */
  suosittelu_syy: string;
  /** Kansikuvan URL-osoite (tyhjä = näytetään oletuskansi) */
  kansikuva_url: string;
  created_at: string;
}

/** Payload for creating or updating an entry (id and created_at are managed by the data layer). */
export type BookInput = Omit<Book, 'id' | 'created_at'>;

/** A book on the "Lukulista" — something the user wants to read later. */
export interface WishlistItem {
  id: string;
  kirjan_nimi: string;
  kirjoittaja: string;
  /** Free note, e.g. why it caught your eye or who recommended it. */
  huomautus: string;
  created_at: string;
}

export type WishlistInput = Omit<WishlistItem, 'id' | 'created_at'>;

/**
 * A recommendation from another user. Deliberately only the "safe" public
 * fields — never the recommender's summaries, quotes, or reflections.
 */
export interface Recommendation {
  kirjan_nimi: string;
  kirjoittaja: string;
  arvio: number;
  suosittelu_syy: string;
}

export const EMPTY_BOOK_INPUT: BookInput = {
  kirjan_nimi: '',
  kirjoittaja: '',
  valmistumispaiva: new Date().toISOString().slice(0, 10),
  arvio: 0,
  yhteenveto: '',
  tarkein_oppi: '',
  mista_pidin: '',
  mista_en_pitanyt: '',
  lempilainaus: '',
  omat_ajatukset: '',
  suosittelen: true,
  suosittelu_syy: '',
  kansikuva_url: '',
};
