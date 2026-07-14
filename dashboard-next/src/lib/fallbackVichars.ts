import type { GeneratedVichar } from './dailyVicharGenerator';

/**
 * Curated Daily Vichars used when live generation is unavailable (e.g. OpenAI
 * quota exhausted). The route rotates through these by the day so the message
 * still changes daily instead of showing the same quote forever.
 */
export const FALLBACK_VICHARS: GeneratedVichar[] = [
  {
    titleEnglish: 'Peace Within',
    titleHindi: 'भीतर की शांति',
    contentEnglish:
      'Peace is not found in the world outside; it awakens the moment the mind rests in the Self.',
    contentHindi:
      'शांति बाहर के संसार में नहीं मिलती; जिस क्षण मन आत्मा में स्थिर होता है, वही शांति जाग उठती है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'The Joy of Seva',
    titleHindi: 'सेवा का सुख',
    contentEnglish:
      'When you serve another without seeking return, you quietly serve the Divine that dwells in all.',
    contentHindi:
      'जब आप बिना किसी प्रतिफल की इच्छा के किसी की सेवा करते हैं, तब आप सबमें बसे परमात्मा की सेवा करते हैं।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'Learn to Let Go',
    titleHindi: 'छोड़ना सीखो',
    contentEnglish: 'Detachment is not indifference; it is loving fully while holding on to nothing.',
    contentHindi: 'वैराग्य उदासीनता नहीं है; यह पूर्ण प्रेम करते हुए भी किसी वस्तु से न बंधना है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'A Grateful Heart',
    titleHindi: 'कृतज्ञ हृदय',
    contentEnglish:
      'A grateful heart turns whatever it has into enough, and every ordinary day into a blessing.',
    contentHindi:
      'कृतज्ञ हृदय जो कुछ भी है उसे पर्याप्त बना देता है, और हर साधारण दिन को आशीर्वाद में बदल देता है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'The Eternal Self',
    titleHindi: 'अमर आत्मा',
    contentEnglish:
      'You are not this passing body or restless mind; you are the changeless awareness that beholds them.',
    contentHindi:
      'आप यह नश्वर शरीर या चंचल मन नहीं हैं; आप वह अपरिवर्तनशील चेतना हैं जो इन्हें देखती है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'Lamp of Devotion',
    titleHindi: 'भक्ति का दीप',
    contentEnglish:
      'Light the lamp of devotion within, and no darkness of the world can dim your path.',
    contentHindi:
      'भीतर भक्ति का दीप जलाओ, फिर संसार का कोई अंधकार तुम्हारे मार्ग को धूमिल नहीं कर सकता।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'This Very Moment',
    titleHindi: 'यही क्षण',
    contentEnglish:
      'The past is a memory and the future a hope; life is lived only in the fullness of this breath.',
    contentHindi:
      'भूत एक स्मृति है और भविष्य एक आशा; जीवन तो केवल इस श्वास की पूर्णता में जिया जाता है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'Gentle Compassion',
    titleHindi: 'करुणा',
    contentEnglish:
      'Speak so gently that even the wounded feel safe near you; this is the beginning of dharma.',
    contentHindi:
      'इतनी कोमलता से बोलो कि आहत भी तुम्हारे पास सुरक्षित अनुभव करे; यही धर्म का आरंभ है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'Action as Worship',
    titleHindi: 'कर्म का मर्म',
    contentEnglish:
      'Do your work as an offering, release the fruit, and action itself becomes worship.',
    contentHindi: 'अपना कर्म अर्पण की भाँति करो, फल को छोड़ दो, तब कर्म ही पूजा बन जाता है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'The Wealth of Contentment',
    titleHindi: 'संतोष धन',
    contentEnglish:
      'The more the heart desires, the more it is bound; contentment is the wealth that none can steal.',
    contentHindi:
      'हृदय जितनी कामना करता है, उतना ही बंध जाता है; संतोष वह धन है जिसे कोई चुरा नहीं सकता।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'One Step of Faith',
    titleHindi: 'श्रद्धा का कदम',
    contentEnglish:
      'Walk one step toward the Divine with trust, and a thousand steps come to meet you.',
    contentHindi:
      'श्रद्धा के साथ परमात्मा की ओर एक कदम बढ़ाओ, और सहस्र कदम तुमसे मिलने चले आते हैं।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'The Voice of Silence',
    titleHindi: 'मौन की वाणी',
    contentEnglish:
      'In silence the noise of the mind settles, and the soft voice of the soul is finally heard.',
    contentHindi:
      'मौन में मन का कोलाहल शांत होता है, और आत्मा की कोमल वाणी अंततः सुनाई देती है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'The Gift of Forgiveness',
    titleHindi: 'क्षमा का उपहार',
    contentEnglish: 'To forgive is to set down a heavy stone you were never meant to carry.',
    contentHindi: 'क्षमा करना उस भारी पत्थर को रख देना है जिसे ढोने के लिए तुम कभी बने ही नहीं थे।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'Mastery of the Senses',
    titleHindi: 'संयम की शक्ति',
    contentEnglish:
      'One who conquers his own restless senses is greater than one who conquers the world.',
    contentHindi: 'जो अपनी चंचल इंद्रियों को जीत लेता है, वह संसार को जीतने वाले से भी महान है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'One Light in All',
    titleHindi: 'सबमें एक ज्योति',
    contentEnglish:
      'See the same light shining in every being, and enmity dissolves like mist before the sun.',
    contentHindi: 'हर प्राणी में वही एक ज्योति देखो, और शत्रुता सूर्य के सामने कोहरे की भाँति मिट जाती है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'The Path of Humility',
    titleHindi: 'विनम्रता का मार्ग',
    contentEnglish:
      'The river bends low to reach the ocean; humility is the path by which the small becomes vast.',
    contentHindi: 'नदी सागर तक पहुँचने के लिए नीचे झुकती है; विनम्रता वह मार्ग है जिससे लघु विराट बन जाता है।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'A Fresh Dawn',
    titleHindi: 'नवीन भोर',
    contentEnglish:
      'Every dawn is a fresh invitation from the Divine; rise with hope and walk with faith.',
    contentHindi: 'हर भोर परमात्मा का एक नवीन निमंत्रण है; आशा के साथ उठो और श्रद्धा के साथ चलो।',
    source: 'Swami Avdheshanand G',
  },
  {
    titleEnglish: 'The Guru Within',
    titleHindi: 'अंतर्गुरु',
    contentEnglish:
      'Seek not only outside for a teacher; the very awareness that seeks is itself the light you seek.',
    contentHindi:
      'गुरु को केवल बाहर मत खोजो; जो चेतना खोज रही है, वही स्वयं वह ज्योति है जिसे तुम खोजते हो।',
    source: 'Swami Avdheshanand G',
  },
];
