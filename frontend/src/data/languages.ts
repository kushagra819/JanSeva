export type JanSevaLanguageCode =
  | 'auto' | 'en' | 'as' | 'bn' | 'brx' | 'doi' | 'gu' | 'hi' | 'kn' | 'ks'
  | 'kok' | 'mai' | 'ml' | 'mni' | 'mr' | 'ne' | 'or' | 'pa' | 'sa' | 'sat'
  | 'sd' | 'ta' | 'te' | 'ur';

export interface JanSevaLanguage {
  code: JanSevaLanguageCode;
  name: string;
  displayName: string;
  speechLocale?: string;
  /** null means genuine Whisper language detection; undefined means unsupported by Whisper. */
  fasterWhisperCode?: string | null;
  browserVoice: 'provider-dependent' | 'not-applicable';
}

/** Single source of truth for typed, browser-voice and faster-whisper language selection. */
export const janSevaLanguages: JanSevaLanguage[] = [
  { code: 'auto', name: 'Auto Detect', displayName: 'Auto Detect (server AI)', fasterWhisperCode: null, browserVoice: 'not-applicable' },
  { code: 'en', name: 'English', displayName: 'English (India)', speechLocale: 'en-IN', fasterWhisperCode: 'en', browserVoice: 'provider-dependent' },
  { code: 'as', name: 'Assamese', displayName: 'অসমীয়া', speechLocale: 'as-IN', fasterWhisperCode: 'as', browserVoice: 'provider-dependent' },
  { code: 'bn', name: 'Bengali', displayName: 'বাংলা', speechLocale: 'bn-IN', fasterWhisperCode: 'bn', browserVoice: 'provider-dependent' },
  { code: 'brx', name: 'Bodo', displayName: 'बड़ो', speechLocale: 'brx-IN', browserVoice: 'provider-dependent' },
  { code: 'doi', name: 'Dogri', displayName: 'डोगरी', speechLocale: 'doi-IN', browserVoice: 'provider-dependent' },
  { code: 'gu', name: 'Gujarati', displayName: 'ગુજરાતી', speechLocale: 'gu-IN', fasterWhisperCode: 'gu', browserVoice: 'provider-dependent' },
  { code: 'hi', name: 'Hindi', displayName: 'हिन्दी', speechLocale: 'hi-IN', fasterWhisperCode: 'hi', browserVoice: 'provider-dependent' },
  { code: 'kn', name: 'Kannada', displayName: 'ಕನ್ನಡ', speechLocale: 'kn-IN', fasterWhisperCode: 'kn', browserVoice: 'provider-dependent' },
  { code: 'ks', name: 'Kashmiri', displayName: 'कॉशुर', speechLocale: 'ks-IN', browserVoice: 'provider-dependent' },
  { code: 'kok', name: 'Konkani', displayName: 'कोंकणी', speechLocale: 'kok-IN', browserVoice: 'provider-dependent' },
  { code: 'mai', name: 'Maithili', displayName: 'मैथिली', speechLocale: 'mai-IN', browserVoice: 'provider-dependent' },
  { code: 'ml', name: 'Malayalam', displayName: 'മലയാളം', speechLocale: 'ml-IN', fasterWhisperCode: 'ml', browserVoice: 'provider-dependent' },
  { code: 'mni', name: 'Manipuri / Meitei', displayName: 'মৈতৈলোন্', speechLocale: 'mni-IN', browserVoice: 'provider-dependent' },
  { code: 'mr', name: 'Marathi', displayName: 'मराठी', speechLocale: 'mr-IN', fasterWhisperCode: 'mr', browserVoice: 'provider-dependent' },
  { code: 'ne', name: 'Nepali', displayName: 'नेपाली', speechLocale: 'ne-NP', fasterWhisperCode: 'ne', browserVoice: 'provider-dependent' },
  { code: 'or', name: 'Odia', displayName: 'ଓଡ଼ିଆ', speechLocale: 'or-IN', browserVoice: 'provider-dependent' },
  { code: 'pa', name: 'Punjabi', displayName: 'ਪੰਜਾਬੀ', speechLocale: 'pa-IN', fasterWhisperCode: 'pa', browserVoice: 'provider-dependent' },
  { code: 'sa', name: 'Sanskrit', displayName: 'संस्कृतम्', speechLocale: 'sa-IN', fasterWhisperCode: 'sa', browserVoice: 'provider-dependent' },
  { code: 'sat', name: 'Santali', displayName: 'ᱥᱟᱱᱛᱟᱲᱤ', speechLocale: 'sat-IN', browserVoice: 'provider-dependent' },
  { code: 'sd', name: 'Sindhi', displayName: 'سنڌي', speechLocale: 'sd-IN', fasterWhisperCode: 'sd', browserVoice: 'provider-dependent' },
  { code: 'ta', name: 'Tamil', displayName: 'தமிழ்', speechLocale: 'ta-IN', fasterWhisperCode: 'ta', browserVoice: 'provider-dependent' },
  { code: 'te', name: 'Telugu', displayName: 'తెలుగు', speechLocale: 'te-IN', fasterWhisperCode: 'te', browserVoice: 'provider-dependent' },
  { code: 'ur', name: 'Urdu', displayName: 'اردو', speechLocale: 'ur-IN', fasterWhisperCode: 'ur', browserVoice: 'provider-dependent' },
];

export const languageByCode = (code: string) => janSevaLanguages.find(language => language.code === code) || janSevaLanguages[0];

