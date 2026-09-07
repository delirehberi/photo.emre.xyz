/**
 * Turkish Dictionary (Primary Default)
 * Phoem — photo.emre.xyz
 */

import type { Dictionary } from './dictionary';

export const trDictionary: Dictionary = {
  locale: 'tr',
  nav: {
    home: 'Ana Sayfa',
    events: 'Etkinlikler',
    about: 'Hakkında',
    contact: 'İletişim',
    admin: 'Yönetim',
    connect: 'Bağlan',
    disconnect: 'Bağlantıyı Kes',
    createEvent: 'Etkinlik Albümü Oluştur',
  },
  home: {
    heroBadge: 'Açık Kaynak • Nostr Tabanlı • Blossom Medya Depolama',
    heroTitle: 'Etkinlikleriniz İçin',
    heroTitleHighlight: 'Egemen Fotoğraf Albümleri',
    heroDescription:
      'Meetup, konferans ve topluluk etkinlikleriniz için sansürsüz ve merkeziyetsiz fotoğraf galerileri. Katılımcılarınız kendi çektikleri fotoğrafları kriptografik imzalarıyla doğrudan albümünüze eklesin.',
    exploreEvents: 'Etkinlik Albümlerini Keşfet',
    addOrganisation: 'Organizasyon Ekle',
    createEventCta: 'Etkinlik Albümü Oluştur',
    nonNostrTitle: 'Fotoğraf yüklemek veya albüm açmak mı istiyorsunuz?',
    nonNostrDesc:
      'Phoem üzerinde etkinlik albümü oluşturmak veya etkinlik fotoğrafları yüklemek için bir Nostr hesabına ihtiyacınız vardır.',
    nonNostrLearnMore:
      'Nostr açık protokolü hakkında bilgi edinmek ve hemen ücretsiz bir hesap edinmek için nostr.org.tr ve nostr.com adreslerini ziyaret edebilirsiniz.',
    featuredTitle: 'Öne Çıkan Etkinlik Albümleri',
    featuredSubtitle:
      'Topluluklar ve bağımsız organizatörler tarafından paylaşılan en son etkinlik albümleri.',
    searchPlaceholder: 'Etkinlik, şehir veya etiket ara...',
    allEvents: 'Tüm Etkinlikleri Gör',
    communityCalloutTitle: 'Topluluğunuzla Birlikte Albüm Oluşturun',
    communityCalloutDesc:
      'Etkinlik bittiğinde herkesin telefonundaki fotoğrafları toplamak artık dert değil. Katılımcılarınız doğrudan albüm sayfasına girerek kendi çektikleri kareleri katkı olarak yükleyebilir.',
    communityCalloutCta: 'Etkinlikleri İncele',
    emptyEvents: 'Henüz gösterilecek etkinlik albümü bulunamadı.',
  },
  events: {
    title: 'Etkinlik Fotoğraf Albümleri',
    subtitle:
      'Nostr ağı üzerindeki açık topluluklar tarafından düzenlenen etkinlikler ve fotoğraf galerileri.',
    searchPlaceholder: 'Etkinlik adı, şehir veya #etiket ara...',
    filterAll: 'Tümü',
    filterSpeakingClub: 'Speaking Club',
    filterCosplay: 'Cosplay',
    filterCommunity: 'Topluluk',
    filterHackathon: 'Hackathon',
    filterConference: 'Konferans',
    filterMeetup: 'Buluşma',
    photosCount: 'fotoğraf',
    organizedBy: 'Düzenleyen:',
    viewAlbum: 'Albümü İncele',
    emptyResults: 'Aramanıza uygun etkinlik bulunamadı',
    emptyResultsDesc:
      'Farklı bir arama terimi veya filtre deneyebilir ya da yeni bir etkinlik albümü oluşturabilirsiniz.',
    noEventsTitle: 'Henüz Yayınlanmış Etkinlik Albümü Yok',
    noEventsDesc:
      'Nostr ağı üzerinde henüz bir etkinlik albümü bulunmuyor. Topluluğunuz veya organizasyonunuz için ilk albümü siz oluşturun.',
    createEventCta: 'Etkinlik Albümü Oluştur',
    backToAllEvents: 'Tüm Etkinliklere Dön',
  },
  org: {
    verifiedOrg: 'Doğrulanmış Organizasyon',
    aboutTitle: 'Organizasyon Hakkında',
    hostedEvents: 'Düzenlenen Etkinlik Albümleri',
    noEventsYet: 'Bu organizasyona ait henüz yayınlanmış etkinlik albümü yok.',
    contactNip05: 'NIP-05 Doğrulaması',
    lightningTip: 'Lightning Bahşiş / Destek',
    website: 'Web Sitesi',
    copyNpub: 'Npub Kopyala',
    copied: 'Kopyalandı!',
    sendZap: 'Zap Gönder',
    zapModalTitle: 'Organizasyona Zap Gönder',
    zapModalDesc:
      'Bu topluluğu ve etkinlik organizatörünü doğrudan Bitcoin Lightning zapleri ile destekleyin.',
    zapAmountLabel: 'Miktar (Satoshi)',
    zapCustomPlaceholder: 'Özel satoshi miktarı',
    zapMemoLabel: 'Yorum / Not (İsteğe Bağlı)',
    zapMemoPlaceholder: 'Harika etkinlikler ve fotoğraflar! ⚡',
    zapSendBtn: 'Zap Gönder',
    zapSuccessTitle: 'Zap Başarıyla Gönderildi!',
    zapSuccessDesc: 'sat doğrudan organizasyona aktarıldı.',
  },
  about: {
    title: 'Phoem Hakkında',
    subtitle:
      'Topluluklar ve organizasyonlar için açık kaynaklı, bağımsız etkinlik fotoğraf albümü uygulaması.',
    whatIsTitle: 'Bu Uygulama Nedir?',
    whatIsDesc:
      'Phoem, etkinlik düzenleyen toplulukların, konferansların ve bağımsız organizatörlerin fotoğraf albümlerini merkezi bir veri tabanına bağımlı olmadan paylaşmasını sağlayan açık bir platformdur.',
    step1Title: '1. Organizasyonunuzu Ekleyin',
    step1Desc:
      'Topluluğunuz için Nostr üzerinde açık bir profil ve kimlik oluşturun. Logonuzu, açıklamanızı ve sosyal bağlantılarınızı ekleyin.',
    step2Title: '2. Etkinlik Albümleri Oluşturun',
    step2Desc:
      'Düzenlediğiniz hackathon, buluşma veya konferans için tarih, konum ve kapak görseliyle yeni bir albüm açın.',
    step3Title: '3. Yüksek Çözünürlükte Yükleyin',
    step3Desc:
      'Resmi etkinlik fotoğraflarınızı Blossom sunucularına orijinal kalitelerinde yükleyin, EXIF verilerini koruyun.',
    step4Title: '4. Katılımcı Fotoğraflarını Toplayın',
    step4Desc:
      'Katılımcılarınız etkinlik sayfasına girerek kendi anılarını yükleyebilir. Resmi fotoğraflar ile topluluk fotoğrafları düzenli şekilde ayrı bölümlerde sergilenir.',
    sovereigntyTitle: 'Veri Egemenliği ve Bağımsızlık',
    sovereigntyDesc:
      'Fotoğraf anılarınızı kapalı şirket sunucularına veya hizmet kapanma risklerine teslim etmeyin. Açık protokoller (Nostr & Blossom) sayesinde albümleriniz her zaman bağımsız, kalıcı ve doğrudan sizin kontrolünüzde kalır.',
    ctaTitle: 'Hemen Kendi Organizasyon Albümünüzü Başlatın',
    ctaBtn: 'Yönetim Paneline Git',
  },
  contact: {
    title: 'İletişim & Topluluk',
    subtitle:
      'Geri bildirimlerinizi iletin, destek alın veya açık topluluğumuza katılın.',
    directChannels: 'Doğrudan İletişim Kanalları',
    nostrIdentity: 'Nostr Kimliği',
    lightningAddress: 'Lightning Destek Adresi',
    relayEndpoint: 'Platform Rölesi',
  },
  admin: {
    title: 'Yönetim Paneli',
    subtitle:
      'Organizasyon profillerinizi yönetin, yeni etkinlik albümleri oluşturun ve sistem istatistiklerini görüntüleyin.',
    menuDashboard: 'Gösterge Paneli',
    menuAddOrg: 'Organizasyon Ekle',
    menuCreateEvent: 'Etkinlik / Albüm Oluştur',
    menuProfile: 'Profilim',
    menuSettings: 'Ayarlar',
    statsOrgs: 'Organizasyonlar',
    statsEvents: 'Etkinlik Albümleri',
    statsPhotos: 'Fotoğraf Varlıkları',
    statsStorage: 'Blossom Depolama',
    relayStatus: 'Röle Durumu',
    relayConnected: 'Röle Ağı Aktif',
    blossomHealth: 'Medya Sunucusu Aktif',
    quickActions: 'Hızlı İşlemler',
    createEventCta: 'Yeni Etkinlik Aç',
    addOrgCta: 'Organizasyon Profili Oluştur',
    purgeCache: 'Önbelleği Temizle',
  },
  album: {
    officialTab: 'Resmi Albüm',
    communityTab: 'Topluluk Fotoğrafları',
    uploadPhotos: 'Fotoğraf Yükle',
    contributePhotos: 'Fotoğraf Katkısı Yap',
    uploadOfficialTitle: 'Resmi Albüme Fotoğraf Ekle',
    uploadCommunityTitle: 'Topluluk Fotoğrafı Ekle',
    organizedBy: 'Düzenleyen:',
    zeroClsNote: 'Sıfır Kayma • Dinamik En Boy Oranı',
    noOfficialPhotos: 'Henüz resmi fotoğraf yüklenmedi',
    noOfficialDesc:
      'Organizatör henüz bu albüm için resmi fotoğrafları yayınlamadı.',
    noCommunityPhotos: 'Henüz topluluk fotoğrafı yok',
    noCommunityDesc:
      'Bu etkinlikte miydiniz? Kendi fotoğraflarınızı ilk yükleyen siz olun!',
    backToEvents: 'Tüm Etkinliklere Dön',
    officialDesc:
      'Etkinlik organizatörü tarafından doğrudan imzalanıp yayınlanan yüksek çözünürlüklü fotoğraflar.',
    communityDesc:
      'Etkinliğe katılan topluluk üyeleri tarafından paylaşılan kareler.',
    downloadHighRes: 'Yüksek Çözünürlükte İndir',
  },
  auth: {
    modalTitle: 'Nostr Hesabı ile Bağlan',
    modalDesc:
      'Etkinlik albümü açmak ve fotoğraf yüklemek için Nostr açık protokolüyle bağlanın. Özel anahtarınız sunucuya asla gönderilmez.',
    tabExtension: 'Tarayıcı Eklentisi (NIP-07)',
    tabBunker: 'Nostr Connect (Bunker)',
    tabKey: 'Özel Anahtar (nsec)',
    tabReadOnly: 'Salt Okunur (npub)',
    extensionTitle: 'Tarayıcı Eklentisi ile Giriş (Önerilen)',
    extensionDesc:
      'Alby, nos2x, Amber veya benzeri bir NIP-07 eklentisi kullanarak güvenle giriş yapın. Anahtarınız tarayıcınızdan asla çıkmaz.',
    extensionConnectBtn: 'Eklenti ile Bağlan',
    extensionNotFound: 'NIP-07 destekli tarayıcı eklentisi bulunamadı.',
    extensionInstallHelp:
      'Giriş yapmak için Alby veya nos2x eklentisini yükleyebilir ya da diğer yöntemleri deneyebilirsiniz.',
    bunkerTitle: 'Nostr Connect (NIP-46) ile Bağlantı',
    bunkerDesc:
      'Uzak imzalayıcınız veya mobil cüzdanınızla QR kod veya bağlantı adresi üzerinden güvenle eşleşin.',
    bunkerModeInput: 'Bağlantı Adresi',
    bunkerModeQr: 'QR ile Eşleş',
    bunkerPlaceholder: 'bunker://... veya kullanici@nsec.app',
    bunkerConnectBtn: 'Bunker ile Bağlan',
    bunkerConnecting: 'Bunker Bağlanıyor...',
    bunkerScanNotice:
      'Amber veya herhangi bir Nostr Connect istemcisiyle tarayın',
    copyPairingUri: 'Eşleşme Adresini Kopyala',
    copiedPairingUri: 'Adres Kopyalandı',
    keyTitle: 'Nostr Özel Anahtarı (nsec)',
    keyPlaceholder: 'nsec1...',
    keyConnectBtn: 'Anahtar ile Giriş Yap',
    keyVolatileNotice:
      'Yalnızca geçici oturum belleğinde tutulur. Hiçbir sunucuya kaydedilmez.',
    keyValidating: 'Doğrulanıyor...',
    orCreateNew: 'veya yeni kimlik oluştur',
    generateKeypairBtn: 'Tarayıcıda Yeni Anahtar Çifti Üret',
    readOnlyTitle: 'Salt Okunur Mod (Görüntüleyici)',
    readOnlyPlaceholder: 'npub1...',
    readOnlyConnectBtn: 'Profil Olarak İncele',
    readOnlyNotice:
      'Albümleri ve fotoğrafları gezebilirsiniz. Fotoğraf imzalama ve yükleme yetkisi yoktur.',
    loggedInAs: 'Bağlı Hesap:',
    copyNpub: 'Npub Kopyala',
    disconnect: 'Bağlantıyı Kes',
    helpNotice:
      'Hesabınız yok mu? nostr.org.tr üzerinden saniyeler içinde ücretsiz bir Nostr kimliği oluşturabilirsiniz.',
  },
  keypair: {
    title: 'Yeni Nostr Kimliği Oluşturuldu',
    description:
      'Özel anahtarınızı güvenli bir yere kaydedin. Kaybolması durumunda kurtarılamaz.',
    warningTitle: 'Kritik Güvenlik Uyarısı',
    warningText:
      'nsec anahtarınız kimliğiniz, albümleriniz ve fotoğraflarınız üzerinde tam yetki sağlar. photo.emre.xyz anahtarınızı hiçbir sunucuda saklamaz.',
    npubLabel: 'Açık Anahtar (npub)',
    shareFreely: 'Serbestçe Paylaşılabilir',
    nsecLabel: 'Gizli Özel Anahtar (nsec)',
    keepSecret: 'Gizli Tutun',
    showKey: 'Özel anahtarı göster',
    hideKey: 'Özel anahtarı gizle',
    copy: 'Kopyala',
    copied: 'Kopyalandı',
    exportBackupTitle: 'Yedek Dosyasını İndir',
    exportBackupDesc:
      'Anahtar yapılandırma dosyanızı güvenli JSON formatında bilgisayarınıza kaydedin.',
    downloadBackupBtn: 'Yedek Dosyasını İndir',
    confirmAcknowledge:
      'nsec anahtarımı güvenli bir yere kaydettim veya yedekledim. Kaybolması durumunda geri alınamayacağını anlıyorum.',
    proceedBtn: 'Organizasyonuma Devam Et',
  },
  upload: {
    modalTitle: 'Fotoğrafları Yükle',
    modalDesc:
      'Fotoğraflar Blossom medya sunucusuna orijinal kalitede aktarılır ve SHA-256 ile doğrulanır.',
    dropzoneText: 'Yüklemek için fotoğrafları buraya sürükleyin veya tıklayın',
    dropzoneSubtext:
      'JPEG, PNG, WebP desteklenir • Boyutlar istemci tarafında otomatik çıkarılır',
    selectFilesBtn: 'Dosyaları Seç',
    supportedFormats: 'JPEG, PNG, WEBP • Maks. 50 MB / dosya',
    uploadProgress: 'Fotoğraflar yükleniyor...',
    uploadSuccess: 'Fotoğraflar başarıyla yüklendi ve albüme eklendi!',
    uploadError: 'Yükleme sırasında hata oluştu. Lütfen tekrar deneyin.',
    cancelBtn: 'İptal',
    closeBtn: 'Kapat',
    submitBtn: 'Yüklemeyi Başlat',
    queueTitle: 'Yükleme Kuyruğu',
    clearQueue: 'Kuyruğu Temizle',
    successTitle: 'Yükleme ve Yayınlama Tamamlandı!',
    successDesc:
      'Tüm fotoğraflar Blossom sunucusuna yüklendi ve Nostr röle ağına başarıyla duyuruldu.',
    authRequiredNotice:
      'Fotoğraf yüklemek ve imzalamak için Nostr hesabı gereklidir.',
    connectBtn: 'Nostr ile Giriş Yap',
    noAccountNotice: 'Hesabınız yok mu?',
    readOnlyNotice: 'Gözlemci modunda (salt okunur) fotoğraf imzalanamaz.',
    readOnlyConnectBtn: 'İmzalayıcı ile Bağlan',
    readOnlyExplanation:
      'Fotoğraflarınızı Nostr protokolünde yayınlamak için NIP-07 eklentisi, Nostr Connect (Bunker) veya gizli anahtarınızla bağlanmanız gerekmektedir.',
    publishingBtn: 'Fotoğraflar Yayınlanıyor...',
    uploadCountBtn: 'Fotoğrafları Yükle ({count} Fotoğraf - Ücretsiz)',
    uploadBtn: 'Fotoğrafları Yükle',
    uploadPartialError:
      'bazı fotoğraflar yüklenemedi. Lütfen kuyruktaki hata ayrıntılarını kontrol ediniz.',
    uploadServerFailed:
      'Fotoğraflar Blossom sunucusuna yüklenemedi. Sunucu izinlerinizi kontrol ediniz veya üst menüden başka bir sunucu seçip tekrar deneyiniz.',
  },
  lightbox: {
    of: '/',
    communityBadge: 'Topluluk Katkısı',
    exifInfo: 'EXIF Bilgisi',
    downloadWatermarked: 'Filigranlı İndir',
    photographicMetadata: 'Fotoğrafik Meta Veriler',
    caption: 'Açıklama / Başlık',
    cameraOptics: 'Kamera ve Optik',
    camera: 'Kamera',
    lens: 'Lens',
    focalLength: 'Odak Uzaklığı',
    exposureParameters: 'Pozlama Parametreleri',
    shutter: 'Enstantane',
    aperture: 'Diyafram',
    iso: 'ISO',
    auto: 'Otomatik',
    technicalInfo: 'Teknik Dosya Bilgisi',
    dimensions: 'Çözünürlük',
    aspectRatio: 'En Boy Oranı',
    format: 'Biçim',
    captured: 'Çekim Tarihi',
    provenance: 'Menşe ve Nostr Kaydı',
    sha256Hash: 'SHA-256 İçerik Özeti:',
    authorPubkey: 'Yükleyen Anahtarı:',
    copyHash: 'SHA-256 Kopyala',
    copiedHash: 'Kopyalandı',
    prevPhoto: 'Önceki Fotoğraf (Sol Ok)',
    nextPhoto: 'Sonraki Fotoğraf (Sağ Ok)',
    jumpToPhoto: '{index}. fotoğrafa git',
    close: 'Kapat (Esc)',
  },
  lightning: {
    title: 'Lightning Ödemesi',
    tabWebln: 'WebLN',
    tabNwc: 'NWC',
    tabQr: 'QR / Fatura',
    adminBadge: 'Yönetici (0 sats)',
    authRequiredTitle: 'Kimlik Doğrulaması Gerekli',
    authRequiredDesc:
      'Ücretli işlemleri onaylamak ve kapatmak için aktif bir Nostr kimliği gereklidir.',
    closeBtn: 'Kapat',
    adminExemptTitle: 'Yönetici Muafiyeti Aktif',
    adminExemptDesc:
      'Kimliğiniz platform yöneticisiyle eşleşmektedir. Tüm işlem ücretleri otomatik olarak 0 sats üzerinden muaf tutulur.',
    adminBypassBtn: 'Ücretsiz Yönetici Onayı ile Devam Et',
    settledTitle: 'Ödeme Başarıyla Tamamlandı!',
    settledDesc:
      'sats başarıyla ödendi. Ödeme kanıtı röle üzerinde doğrulandı.',
    preimageLabel: 'Ödeme Ön-Görüntüsü (Preimage)',
    continueBtn: 'Devam Et',
    weblnDetected: 'WebLN Tarayıcı Cüzdanı Algılandı',
    weblnDesc:
      'Ödemeyi tarayıcı cüzdanınız (Alby vb.) üzerinden doğrudan onaylayın.',
    weblnPayBtn: 'WebLN ile Öde',
    weblnConfirming: 'WebLN ile Onaylanıyor...',
    weblnNotFound:
      'Bu tarayıcıda WebLN eklentisi bulunamadı. Alby kurabilir veya QR kod ile ödeyebilirsiniz.',
    installAlby: 'Alby Eklentisini Yükle',
    payQrInstead: 'QR Kod ile Öde',
    nwcConnected: 'Bağlı NWC Cüzdanı',
    nwcDisconnect: 'Bağlantıyı Kes',
    nwcPayBtn: 'NWC ile Öde',
    nwcExecuting: 'NWC Ödemesi Gerçekleştiriliyor...',
    nwcLabel: 'NIP-47 Bağlantı Adresi',
    nwcPlaceholder: 'nostr+walletconnect://...',
    nwcSaveBtn: 'NWC Cüzdanını Kaydet ve Bağla',
    generatingInvoice: 'NIP-57 zap faturası oluşturuluyor...',
    openInWallet: 'Cüzdanda aç',
    awaitingRelay: 'Röle onayı bekleniyor...',
  },
  footer: {
    nostrOrgTrProject: 'Bir nostr.org.tr projesidir',
    tagline: 'Etkinlik Fotoğraf Albümü Platformu • Nostr • Blossom Medya',
    openSourceDesc:
      'Açık kaynaklı, sansürsüz ve bağımsız topluluk fotoğraf albümü platformu.',
  },
  common: {
    loading: 'Yükleniyor...',
    error: 'Bir hata oluştu',
    retry: 'Yeniden Dene',
    back: 'Geri Dön',
    save: 'Kaydet',
    copied: 'Kopyalandı',
  },
  blossom: {
    serverLabel: 'Medya Sunucusu (Blossom)',
    recommendedServers: 'Önerilen Blossom Sunucuları',
    customServer: 'Özel Sunucu',
    addCustomServer: 'Özel Sunucu Adresi Ekle...',
    communityNotice:
      'nostr.org.tr topluluk üyelerine açıktır. Üye anahtarınızla NIP-98 imzalı yükleme yapabilirsiniz.',
    privateNotice:
      'Özel Sunucu: Yetkili organizasyon veya yönetici anahtarları ile erişilebilir.',
    primalNotice:
      'Hızlı genel erişimli varsayılan Blossom CDN. Herkese açıktır.',
    freeBetaBadge: 'Beta: Ücretsiz',
  },
};
