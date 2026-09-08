/**
 * English Dictionary (Secondary Locale)
 * Phoem — photo.emre.xyz
 */

import type { Dictionary } from './dictionary';

export const enDictionary: Dictionary = {
  locale: 'en',
  nav: {
    home: 'Home',
    events: 'Events',
    about: 'About',
    contact: 'Contact',
    admin: 'Admin',
    connect: 'Connect',
    disconnect: 'Disconnect',
    createEvent: 'Create Event Album',
  },
  home: {
    heroBadge: 'Open-Source • Nostr-Powered • Blossom Media Storage',
    heroTitle: 'Photo Albums for Your',
    heroTitleHighlight: 'Sovereign Events',
    heroDescription:
      'Censorship-resistant, decentralized event galleries for meetups, hackathons, and conferences. Attendees can directly contribute their own photos with cryptographic signatures.',
    exploreEvents: 'Explore Event Albums',
    addOrganisation: 'Add Organisation',
    createEventCta: 'Create Event Album',
    nonNostrTitle: 'Want to upload photos or create an event album?',
    nonNostrDesc:
      'You need a Nostr account to publish event albums and upload photos to Phoem.',
    nonNostrLearnMore:
      'To learn more about the open Nostr protocol and get an account in seconds, check nostr.org.tr and nostr.com.',
    featuredTitle: 'Featured Event Albums',
    featuredSubtitle:
      'Recent event photo galleries published by communities and sovereign organizers.',
    searchPlaceholder: 'Search event, city, or tag...',
    allEvents: 'View All Events',
    communityCalloutTitle: 'Co-create Event Albums with Attendees',
    communityCalloutDesc:
      'No more chasing attendees for event photos. Anyone who attended can navigate to the event album page and contribute their photos directly with cryptographic verification.',
    communityCalloutCta: 'Browse Events',
    emptyEvents: 'No event albums found to display yet.',
  },
  events: {
    title: 'Event Photo Albums',
    subtitle:
      'Discover event galleries and photography hosted by sovereign communities on the Nostr network.',
    searchPlaceholder: 'Search by event name, location, or #tag...',
    filterAll: 'All',
    filterSpeakingClub: 'Speaking Club',
    filterCosplay: 'Cosplay',
    filterCommunity: 'Community',
    filterHackathon: 'Hackathon',
    filterConference: 'Conference',
    filterMeetup: 'Meetup',
    photosCount: 'photos',
    organizedBy: 'Organized by:',
    viewAlbum: 'View Album',
    emptyResults: 'No events matched your search',
    emptyResultsDesc:
      'Try adjusting your search keywords or create a new event album from the admin panel.',
    noEventsTitle: 'No Event Albums Published Yet',
    noEventsDesc:
      'There are no event albums published on the Nostr network yet. Be the first to create an album for your community or organization.',
    createEventCta: 'Create Event Album',
    backToAllEvents: 'Back to All Events',
  },
  org: {
    verifiedOrg: 'Verified Organisation',
    aboutTitle: 'About Organisation',
    hostedEvents: 'Hosted Event Albums',
    noEventsYet: 'No event albums published by this organisation yet.',
    contactNip05: 'NIP-05 Identifier',
    lightningTip: 'Lightning Tip / Support',
    website: 'Website',
    copyNpub: 'Copy Npub',
    copied: 'Copied!',
    sendZap: 'Send Zap',
    zapModalTitle: 'Send Zap to Organisation',
    zapModalDesc:
      'Support this sovereign community directly with Bitcoin Lightning zaps.',
    zapAmountLabel: 'Amount (Satoshis)',
    zapCustomPlaceholder: 'Custom sats amount',
    zapMemoLabel: 'Comment / Note (Optional)',
    zapMemoPlaceholder: 'Great events and photography! ⚡',
    zapSendBtn: 'Send Zap',
    zapSuccessTitle: 'Zap Settled Successfully!',
    zapSuccessDesc: 'sats were sent directly to the organisation.',
  },
  about: {
    title: 'About Phoem',
    subtitle:
      'An open-source, sovereign photo album application for communities and event organizers.',
    whatIsTitle: 'What is Phoem?',
    whatIsDesc:
      'Phoem is an open event album platform where meetups, hackathons, and conferences host full-resolution photo albums without dependence on centralized databases or proprietary cloud silos.',
    step1Title: '1. Add Your Organisation',
    step1Desc:
      'Establish an open Nostr identity for your community. Add your logo, description, and contact links.',
    step2Title: '2. Create Event Albums',
    step2Desc:
      'Publish time-based event albums for your hackathons or conferences with dates, location, and cover art.',
    step3Title: '3. Upload in High Resolution',
    step3Desc:
      'Upload organizer photos directly to decentralized Blossom media servers with intact EXIF metadata.',
    step4Title: '4. Crowdsource Attendee Photos',
    step4Desc:
      'Attendees can visit the event album and contribute their own photos. Official and community submissions are cleanly partitioned.',
    sovereigntyTitle: 'Data Sovereignty & Independence',
    sovereigntyDesc:
      "Don't trap your community's photo memories inside proprietary corporate silos. Built on open protocols (Nostr & Blossom), your albums remain permanent, independent, and entirely under your cryptographic control.",
    ctaTitle: 'Ready to Host Your Organisation Albums?',
    ctaBtn: 'Open Admin Panel',
  },
  contact: {
    title: 'Contact & Community',
    subtitle:
      'Send feedback, get technical assistance, or connect with our open community.',
    directChannels: 'Direct Communication Channels',
    nostrIdentity: 'Nostr Identity',
    lightningAddress: 'Lightning Support Address',
    relayEndpoint: 'Platform Relay',
  },
  admin: {
    title: 'Admin Panel',
    subtitle:
      'Manage organisation profiles, publish new event albums, and inspect network health.',
    menuDashboard: 'Dashboard',
    menuAddOrg: 'Add Organisation',
    menuCreateEvent: 'Create Event / Album',
    menuProfile: 'My Profile',
    menuSettings: 'Settings',
    statsOrgs: 'Organisations',
    statsEvents: 'Event Albums',
    statsPhotos: 'Photo Assets',
    statsStorage: 'Blossom Storage',
    relayStatus: 'Relay Status',
    relayConnected: 'Relay Mesh Active',
    blossomHealth: 'Media Server Online',
    quickActions: 'Quick Actions',
    createEventCta: 'Create Event Album',
    addOrgCta: 'Create Organisation Profile',
    purgeCache: 'Purge Edge Cache',
  },
  album: {
    officialTab: 'Official Gallery',
    communityTab: 'Community Photos',
    uploadPhotos: 'Upload Photos',
    contributePhotos: 'Contribute Photos',
    uploadOfficialTitle: 'Upload to Official Gallery',
    uploadCommunityTitle: 'Contribute Community Photos',
    organizedBy: 'Organized by:',
    zeroClsNote: 'Zero-CLS • Dynamic Aspect Ratio',
    noOfficialPhotos: 'No official photos uploaded yet',
    noOfficialDesc:
      'The event organizer has not published official photos for this album yet.',
    noCommunityPhotos: 'No community submissions yet',
    noCommunityDesc:
      'Were you at this event? Be the first attendee to contribute your photos!',
    backToEvents: 'Back to All Events',
    officialDesc:
      'High-resolution photos signed and published directly by the event organizer.',
    communityDesc:
      'Moments captured and shared by attendees who participated in the event.',
    downloadHighRes: 'Download',
  },
  auth: {
    modalTitle: 'Connect with Nostr Account',
    modalDesc:
      'Connect via the open Nostr protocol to publish event albums and upload photos. Your private key is never transmitted to any server.',
    tabExtension: 'Browser Extension (NIP-07)',
    tabBunker: 'Nostr Connect (Bunker)',
    tabKey: 'Private Key (nsec)',
    tabReadOnly: 'Read Only (npub)',
    extensionTitle: 'Browser Extension Login (Recommended)',
    extensionDesc:
      'Log in safely using Alby, nos2x, Amber, or any NIP-07 compatible extension. Your private key never leaves your browser.',
    extensionConnectBtn: 'Connect with Extension',
    extensionNotFound: 'No NIP-07 extension detected in your browser.',
    extensionInstallHelp:
      'Install Alby or nos2x extension to continue, or use one of the alternative methods below.',
    bunkerTitle: 'Connect via Nostr Connect (NIP-46)',
    bunkerDesc:
      'Pair securely with your remote signer or mobile wallet via connection string or QR code.',
    bunkerModeInput: 'Connection String',
    bunkerModeQr: 'Pair via QR',
    bunkerPlaceholder: 'bunker://... or user@nsec.app',
    bunkerConnectBtn: 'Connect Bunker',
    bunkerConnecting: 'Connecting to Bunker...',
    bunkerScanNotice: 'Scan with Amber or any Nostr Connect client',
    copyPairingUri: 'Copy Pairing URI',
    copiedPairingUri: 'Copied URI',
    keyTitle: 'Nostr Secret Key (nsec)',
    keyPlaceholder: 'nsec1...',
    keyConnectBtn: 'Log In with nsec',
    keyVolatileNotice:
      'Held strictly in volatile memory. Never sent or saved to any server.',
    keyValidating: 'Validating...',
    orCreateNew: 'or create new',
    generateKeypairBtn: 'Generate New In-Browser Keypair',
    readOnlyTitle: 'Read-Only Mode (Viewer)',
    readOnlyPlaceholder: 'npub1...',
    readOnlyConnectBtn: 'Browse as Profile',
    readOnlyNotice:
      'Browse galleries and view albums. Cannot sign events or upload photos.',
    loggedInAs: 'Connected Account:',
    copyNpub: 'Copy Npub',
    disconnect: 'Disconnect',
    helpNotice:
      "Don't have an account? Create a free cryptographic Nostr identity in seconds at nostr.org.tr or nostr.com.",
  },
  keypair: {
    title: 'New Nostr Identity Created',
    description:
      'Store your private key securely. It cannot be recovered if lost.',
    warningTitle: 'Critical Security Warning',
    warningText:
      'Your nsec gives complete control over your identity, albums, and uploads. photo.emre.xyz does not store your private key on any server.',
    npubLabel: 'Public Key (npub)',
    shareFreely: 'Share Freely',
    nsecLabel: 'Private Secret Key (nsec)',
    keepSecret: 'Keep Secret',
    showKey: 'Show secret key',
    hideKey: 'Hide secret key',
    copy: 'Copy',
    copied: 'Copied',
    exportBackupTitle: 'Export Backup File',
    exportBackupDesc:
      'Save key configuration JSON file to disk for safe storage.',
    downloadBackupBtn: 'Download Backup',
    confirmAcknowledge:
      'I have written down or saved my nsec in a safe place. I understand it cannot be recovered.',
    proceedBtn: 'Proceed to Organization',
  },
  upload: {
    modalTitle: 'Upload Photos',
    modalDesc:
      'Photos are uploaded directly to the Blossom media server in original resolution and verified via SHA-256.',
    dropzoneText: 'Click or drag images here to upload',
    dropzoneSubtext:
      'JPEG, PNG, WebP supported • Natural dimensions extracted client-side',
    selectFilesBtn: 'Select Files',
    supportedFormats: 'JPEG, PNG, WEBP • Max 50 MB per file',
    uploadProgress: 'Uploading photos...',
    uploadSuccess: 'Photos uploaded and linked to the album successfully!',
    uploadError: 'An error occurred during upload. Please try again.',
    cancelBtn: 'Cancel',
    closeBtn: 'Close',
    submitBtn: 'Start Upload',
    queueTitle: 'Upload Queue',
    clearQueue: 'Clear Queue',
    successTitle: 'Upload & Publishing Complete!',
    successDesc:
      'All photos have been uploaded to Blossom and broadcasted to the Nostr relay mesh.',
    authRequiredNotice:
      'A Nostr account is required to upload and sign photo events.',
    connectBtn: 'Log In with Nostr',
    noAccountNotice: "Don't have an account?",
    readOnlyNotice: 'Read-only observer mode cannot sign photo events.',
    readOnlyConnectBtn: 'Connect with Signer',
    readOnlyExplanation:
      'To publish photos to the Nostr protocol, you must connect via NIP-07 extension, Nostr Connect (Bunker), or private key.',
    publishingBtn: 'Publishing Photos...',
    uploadCountBtn: 'Upload Photos ({count} Photos - Free)',
    uploadBtn: 'Upload Photos',
    uploadPartialError:
      'some photos could not be uploaded. Please inspect error details in the queue.',
    uploadServerFailed:
      'Photos could not be uploaded to the Blossom server. Check your permissions or select another server from the menu.',
  },
  lightbox: {
    of: 'of',
    communityBadge: 'Community Contribution',
    exifInfo: 'EXIF Info',
    downloadWatermarked: 'Download',
    downloadFullRes: 'Download',
    download: 'Download',
    photographicMetadata: 'Photographic Metadata',
    caption: 'Caption',
    cameraOptics: 'Camera & Optics',
    camera: 'Camera',
    lens: 'Lens',
    focalLength: 'Focal Length',
    exposureParameters: 'Exposure Parameters',
    shutter: 'Shutter',
    aperture: 'Aperture',
    iso: 'ISO',
    auto: 'Auto',
    technicalInfo: 'Technical File Info',
    dimensions: 'Dimensions',
    aspectRatio: 'Aspect Ratio',
    format: 'Format',
    captured: 'Captured',
    provenance: 'Provenance & Nostr Record',
    sha256Hash: 'SHA-256 Content Hash:',
    authorPubkey: 'Author Pubkey:',
    copyHash: 'Copy SHA-256',
    copiedHash: 'Copied',
    prevPhoto: 'Previous Photo (Arrow Left)',
    nextPhoto: 'Next Photo (Arrow Right)',
    jumpToPhoto: 'Jump to photo {index}',
    close: 'Close (Esc)',
  },
  lightning: {
    title: 'Lightning Payment',
    tabWebln: 'WebLN',
    tabNwc: 'NWC',
    tabQr: 'QR / Invoice',
    adminBadge: 'Admin (0 sats)',
    authRequiredTitle: 'Authentication Required',
    authRequiredDesc:
      'An active authenticated Nostr identity is required to authorize and settle monetized platform actions.',
    closeBtn: 'Close',
    adminExemptTitle: 'Administrator Exemption Active',
    adminExemptDesc:
      'Your authenticated public key matches the platform administrator key. All action fees are bypassed automatically at 0 sats.',
    adminBypassBtn: 'Proceed with Free Admin Bypass',
    settledTitle: 'Payment Settled Successfully!',
    settledDesc: 'sats settled successfully. Proof verified on-relay.',
    preimageLabel: 'Payment Preimage',
    continueBtn: 'Continue',
    weblnDetected: 'WebLN Extension Detected',
    weblnDesc:
      'Authorize payment directly through your browser wallet (e.g. Alby, Mutiny).',
    weblnPayBtn: 'Pay with WebLN',
    weblnConfirming: 'Confirming in WebLN...',
    weblnNotFound:
      'No WebLN extension detected in this browser. Install Alby or pay via QR code / NWC.',
    installAlby: 'Install Alby Extension',
    payQrInstead: 'Pay with QR Code Instead',
    nwcConnected: 'Connected NWC Wallet',
    nwcDisconnect: 'Disconnect',
    nwcPayBtn: 'Pay with NWC',
    nwcExecuting: 'Executing NWC Payment...',
    nwcLabel: 'NIP-47 Connection URI',
    nwcPlaceholder: 'nostr+walletconnect://...',
    nwcSaveBtn: 'Save & Connect NWC Wallet',
    generatingInvoice: 'Generating NIP-57 zap invoice...',
    openInWallet: 'Open in wallet',
    awaitingRelay: 'Awaiting relay settlement...',
  },
  footer: {
    nostrOrgTrProject: 'A nostr.org.tr project',
    tagline: 'Event Photo Album Platform • Nostr • Blossom Media',
    openSourceDesc:
      'Open-source, sovereign, and censorship-resistant community photo album platform.',
    policy: 'Privacy & Photo Policy',
    deleteRequest: 'Photo Removal Request',
  },
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    back: 'Go Back',
    save: 'Save',
    copied: 'Copied',
  },
  blossom: {
    serverLabel: 'Media Server (Blossom)',
    recommendedServers: 'Recommended Blossom Servers',
    customServer: 'Custom Server',
    addCustomServer: 'Add Custom Server URL...',
    communityNotice:
      'Available for nostr.org.tr community members. Authorize uploads via NIP-98 with your Nostr key.',
    privateNotice:
      'Private Server: Restricted to authorized organizations and administrator keys.',
    primalNotice: 'High-speed public default Blossom CDN. Open to everyone.',
    freeBetaBadge: 'Beta: Free',
  },
  policy: {
    title: 'Community Policy & Likeness Rights',
    subtitle:
      'Phoem is a sovereign event photography platform built on decentralized protocols (Nostr and Blossom). Our principles regarding personal privacy, likeness rights, and content removal are detailed below.',
    badge: 'Transparency & Sovereignty',
    sovereigntyTitle: '1. Decentralized & Sovereign Architecture',
    sovereigntyDesc:
      'Phoem maintains no centralized database or proprietary media cloud. Photo metadata exists as cryptographically signed events on Nostr relays. Media files are hosted on content-addressable (SHA-256) open Blossom servers.',
    likenessRightsTitle: '2. Personal Likeness & Privacy Rights',
    likenessRightsDesc:
      'Every individual has an inalienable right over their own likeness and personal image (GDPR, KVKK, and universal rights of privacy). If you recognize yourself in an event photograph and wish to have it removed, your request is legitimate and honored as a top priority.',
    photographerDutiesTitle: '3. Photographer & Organizer Responsibilities',
    photographerDutiesDesc:
      'All community members who create albums and upload photos to Phoem pledge to respect attendee consent, never publish invasive or sensitive moments, and promptly honor legitimate takedown requests.',
    technicalDeletionTitle: '4. How Technical Deletion Works',
    technicalDeletionDesc:
      'Unlike walled gardens, deletion across sovereign decentralized networks operates through coordinated protocol layers:',
    blossomMechanism:
      'Blossom Server Deletion (BUD-01 / BUD-02): The uploader signs a Kind 24242 delete authorization via NIP-98 to permanently delete the image blob from their Blossom server.',
    nostrMechanism:
      'Nostr Event Deletion (NIP-09): The photographer or album curator publishes a Kind 5 (deletion) event or updates the album event to retract the photo reference from relays.',
    resolutionStepsTitle: '5. Steps to Request Photo Removal',
    step1Title: 'Step 1: Contact the Photo Uploader (Direct)',
    step1Desc:
      'Every photograph cryptographically identifies its provider (pubkey / npub). Using our "Photo Removal Request" tool, you can reach the photographer directly via Nostr encrypted DM or open web clients (Primal, njump, Coracle).',
    step2Title: 'Step 2: Reach Out to the Event Organizer',
    step2Desc:
      'If the photographer does not respond, the event organizer who curates the album can update the event to remove the image from the public gallery.',
    step3Title: 'Step 3: Blossom Host & Platform Moderation',
    step3Desc:
      'If content remains disputed, you may file an abuse/takedown notice with the Blossom server host, or report it to Phoem maintainers for client-level filtering.',
    ctaTitle: 'Did you spot yourself in a photo?',
    ctaDesc:
      'Use the SHA-256 hash code and the uploader’s Nostr identity to generate a direct removal request.',
    ctaBtn: 'Open Removal Request Tool',
  },
  deleteRequest: {
    title: 'Photo Removal Request',
    subtitle:
      'If you see a photograph of yourself in an event album and want it removed, use this tool to locate the uploader on Nostr, generate a formal removal request, or report the content.',
    badge: 'Likeness & Privacy Rights',
    introAlert:
      'Phoem is an open protocol; photos are hosted on photographers’ Blossom servers. This tool gathers the cryptographic identifiers needed so you can reach the uploader directly on Nostr with a ready-to-send message.',
    formTitle: 'Photo & Uploader Identifiers',
    photoHashLabel: 'Photo SHA-256 Hash Code',
    photoHashPlaceholder: 'e.g. a3f5b8c... (64-character hex hash)',
    photoUrlLabel: 'Photo / Image URL',
    photoUrlPlaceholder: 'https://cdn.example.com/sha256...',
    uploaderLabel: 'Photo Uploader (Nostr Pubkey or npub)',
    uploaderPlaceholder: 'npub1... or 64-character hex pubkey',
    albumLabel: 'Event / Album Coordinate',
    albumPlaceholder: 'Event name or naddr...',
    reasonLabel: 'Reason for Removal Request',
    reasonLikeness:
      'I appear in this photo and do not consent to its publication',
    reasonCopyright: 'I hold copyright / photo taken without permission',
    reasonPrivacy: 'Personal privacy or sensitive depiction',
    reasonOther: 'Other / Requires explanation',
    additionalDetailsLabel: 'Additional Notes (Optional)',
    additionalDetailsPlaceholder:
      'Any additional context you would like to include for the photographer...',
    contactUploaderTitle: 'Reach Out to the Uploader',
    contactUploaderDesc:
      'Only the uploader can cryptographically delete the media blob from their Blossom server. Contact them directly through any of these Nostr avenues:',
    openInPrimal: 'Open in Primal & Send DM',
    openInNjump: 'View Profile on njump',
    openInCoracle: 'Open in Coracle',
    openInNostrApp: 'Open in Native Nostr App (nostr:)',
    copyMessageBtn: 'Copy Request Message',
    messageCopied: 'Request message copied to clipboard!',
    messageTemplateLabel: 'Pre-Composed Removal Message for Uploader',
    sendDirectDm: 'Send Direct Nostr DM',
    dmSentSuccess: 'Message successfully sent over Nostr relays!',
    fallbackTitle: 'What if the Uploader Does Not Respond?',
    fallbackDesc:
      'If the photographer does not respond within a reasonable timeframe, you can proceed with these escalations:',
    blossomTakedownTitle: '1. Blossom Server Abuse Notice',
    blossomTakedownDesc:
      'Contact the Blossom media host hosting the photo (often abuse@ or via their website) specifying the SHA-256 hash to request server-level blob deletion.',
    escalateToPlatform:
      '2. Phoem Client Blocklist: Contact us at nostr@photo.emre.xyz or our NIP-05 address with the photo hash to filter the media from the Phoem web client.',
    emptyUploaderNotice:
      'Please enter the photo SHA-256 hash or the uploader Nostr pubkey in the form above.',
    invalidHashNotice: 'Invalid SHA-256 hash code.',
    resolvedNpub: 'Resolved Nostr Address',
    copyNpub: 'Copy npub',
    copiedNpub: 'Copied',
    readPolicyLink: 'Review our Privacy & Photo Policy',
    howItWorksTitle: 'How Content Removal Works',
    step1Guide:
      '1. Retrieve the SHA-256 hash from the photo details or Lightbox information panel.',
    step2Guide:
      '2. Open the uploader’s profile on Primal, Coracle, or your Nostr client with our pre-composed note.',
    step3Guide:
      '3. The uploader signs a Kind 24242 deletion event to permanently purge the file from Blossom.',
  },
};
