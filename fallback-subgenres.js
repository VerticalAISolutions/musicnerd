/**
 * Fallback-Listen nach Subgenre: Phrasen "artist song" pro Stil.
 * Werden beim Fallback genutzt, wenn das jeweilige Genre gewählt ist.
 * Daten aus fallbacks/*.seeds.js. Globale Variablen für index.html.
 */
(function () {
    'use strict';

    window.fallbackRockSubgenres = {
        classic_rock_roots: [
            'the beatles helter skelter',
            'the rolling stones gimme shelter',
            'the who my generation',
            'led zeppelin whole lotta love',
            'the kinks you really got me',
            'cream sunshine of your love',
            'jimi hendrix purple haze',
            'the doors break on through'
        ],
        '70s_art_hard_rock': [
            'david bowie heroes',
            'pink floyd time',
            'queen stone cold crazy',
            'black sabbath paranoid',
            'neil young cortez the killer',
            'talking heads psycho killer',
            'iggy pop lust for life',
            'fleetwood mac the chain'
        ],
        post_punk_new_wave_rock: [
            'joy division transmission',
            'the cure boys dont cry',
            'u2 i will follow',
            'talking heads once in a lifetime',
            'the police message in a bottle',
            'echo and the bunnymen the killing moon',
            'siouxsie and the banshees spellbound',
            'the fall totally wired'
        ],
        alternative_90s: [
            'nirvana in bloom',
            'radiohead fake plastic trees',
            'pearl jam alive',
            'soundgarden black hole sun',
            'smashing pumpkins cherub rock',
            'stone temple pilots plush',
            'alice in chains would',
            'rage against the machine killing in the name'
        ],
        modern_rock: [
            'the strokes last nite',
            'arctic monkeys do i wanna know',
            'queens of the stone age no one knows',
            'foo fighters everlong',
            'the national bloodbuzz ohio',
            'tame impala elephant',
            'idles mother',
            'fontaines dc i dont belong'
        ]
    };

    window.fallbackPopSubgenres = {
        classic_pop_foundations: [
            'abba dancing queen',
            'michael jackson dont stop til you get enough',
            'madonna into the groove',
            'prince kiss',
            'whitney houston how will i know',
            'george michael faith',
            'elton john rocket man',
            'bee gees stayin alive'
        ],
        '90s_2000s_pop_shift': [
            'britney spears toxic',
            'backstreet boys everybody',
            'spice girls wannabe',
            'janet jackson thats the way love goes',
            'madonna ray of light',
            'tlc waterfalls',
            'destinys child say my name',
            'robyn show me love'
        ],
        indie_pop_crossover: [
            'lorde royals',
            'lana del rey video games',
            'robyn dancing on my own',
            'mgmt electric feel',
            'phoenix lisztomania',
            'taylor swift style',
            'dua lipa new rules',
            'billie eilish bad guy'
        ],
        modern_global_pop: [
            'harry styles as it was',
            'the weeknd blinding lights',
            'olivia rodrigo good 4 u',
            'charli xcx claws',
            'rosalia saoko',
            'bad bunny titi me pregunto',
            'doja cat say so',
            'sza kill bill'
        ]
    };

    window.fallbackHiphopSubgenres = {
        old_school_roots: [
            'grandmaster flash the message',
            'run dmc its like that',
            'public enemy rebel without a pause',
            'eric b and rakim paid in full',
            'beastie boys fight for your right',
            'll cool j rock the bells',
            'boogie down productions south bronx',
            'nwa straight outta compton'
        ],
        golden_era_90s: [
            'nas ny state of mind',
            'a tribe called quest scenario',
            'wu tang clan protect ya neck',
            'notorious big juicy',
            '2pac california love',
            'gang starr mass appeal',
            'mobb deep shook ones pt ii',
            'outkast elevators'
        ],
        '2000s_mainstream_underground': [
            'jay z dirt off your shoulder',
            'kanye west jesus walks',
            'eminem stan',
            'missy elliott get ur freak on',
            '50 cent in da club',
            'the roots you got me',
            'common the light',
            'mf doom rhymes like dimes'
        ],
        modern_hiphop: [
            'kendrick lamar alright',
            'drake hotline bling',
            'tyler the creator see you again',
            'run the jewels legend has it',
            'travis scott sicko mode',
            'cardi b bodak yellow',
            'jid never',
            'little simz venom'
        ]
    };

    window.fallbackElectronicSubgenres = {
        mainstream_electronic: [
            'daft punk get lucky',
            'depeche mode enjoy the silence',
            'new order blue monday',
            'eurythmics sweet dreams',
            'pet shop boys west end girls',
            'darude sandstorm',
            'robert miles children',
            'disclosure latch',
            'flume never be like you',
            'rufus du sol innerbloom',
            'odesza say my name',
            'kaytranada glowed up',
            'jamie xx gosh',
            'bonobo kerala'
        ],
        idm_ambient: [
            'new order true faith',
            'massive attack unfinished sympathy',
            'portishead sour times',
            'underworld born slippy',
            'four tet she just likes to fight',
            'caribou cant do without you',
            'moderat bad kingdom',
            'jon hopkins open eye signal',
            'floating points silhouettes'
        ],
        leftfield_idm: [
            'leftfield open up',
            'orb little fluffly clouds',
            'the orb blue room',
            'future sound of london papua new guinea',
            'lfo lfo',
            'aphex twin windowlicker',
            'burial archangel',
            'boards of canada roygbiv',
            'autechre gantz graf',
            'squarepusher do you know squarepusher'
        ]
    };

    window.fallbackRnbSoulSubgenres = {
        early_soul_rnb_roots: [
            'ray charles whatd i say',
            'sam cooke a change is gonna come',
            'james brown please please please',
            'ruth brown mama he treats your daughter mean',
            'jackie wilson lonely teardrops',
            'etta james at last',
            'the drifters save the last dance for me',
            'ben e king stand by me'
        ],
        motown_classic_soul: [
            'marvin gaye whats going on',
            'the supremes you cant hurry love',
            'stevie wonder signed sealed delivered',
            'smokey robinson tears of a clown',
            'the temptations my girl',
            'four tops reach out ill be there',
            'martha and the vandellas dancing in the street',
            'jackson 5 i want you back'
        ],
        deep_soul_funk: [
            'aretha franklin respect',
            'otis redding sittin on the dock of the bay',
            'al green lets stay together',
            'bill withers aint no sunshine',
            'curtis mayfield move on up',
            'donny hathaway this christmas',
            'isaac hayes theme from shaft',
            'sly and the family stone family affair'
        ],
        smooth_soul_70s_80s: [
            'stevie wonder sir duke',
            'earth wind and fire september',
            'luther vandross never too much',
            'anita baker sweet love',
            'lionel richie hello',
            'chaka khan aint nobody',
            'prince when doves cry',
            'michael jackson off the wall'
        ],
        new_jack_swing_early_rnb: [
            'janet jackson thats the way love goes',
            'bobby brown my prerogative',
            'bell biv devoe poison',
            'guy groove me',
            'keith sweat i want her',
            'new edition can you stand the rain',
            'toni braxton breathe again',
            'mary j blige real love'
        ],
        neo_soul_90s: [
            'dangelo brown sugar',
            'erykah badu on and on',
            'lauryn hill doo wop that thing',
            'maxwell ascension',
            'jill scott a long walk',
            'mos def ms fat booty',
            'the roots you got me',
            'india arie video'
        ],
        '2000s_rnb_pop_crossover': [
            'alicia keys fallin',
            'usher u got it bad',
            'beyonce crazy in love',
            'destinys child say my name',
            'ne yo so sick',
            'john legend ordinary people',
            'rihanna umbrella',
            'justin timberlake cry me a river'
        ],
        modern_alt_rnb: [
            'frank ocean thinkin bout you',
            'the weeknd wicked games',
            'miguel adorn',
            'solange cranes in the sky',
            'sza love galore',
            'james blake retrograde',
            'sampha blood on me',
            'jhene aiko the worst'
        ],
        contemporary_soul_future_rnb: [
            'h e r focus',
            'daniel caesar get you',
            'anderson paak am i wrong',
            'summer walker girls need love',
            'cleo sol why dont you',
            'lucky daye roll some mo',
            'jazmine sullivan lost one',
            'snoh aalegra i want you around'
        ]
    };

    window.fallbackCountrySubgenres = {
        early_country_roots: [
            'the carter family wildwood flower',
            'jimmie rodgers blue yodel no 1',
            'hank williams im so lonesome i could cry',
            'lefty frizzell long black veil',
            'ernest tubb walking the floor over you',
            'kitty wells it wasnt god who made honky tonk angels',
            'bob wills faded love',
            'merle travis sixteen tons'
        ],
        honky_tonk_traditional: [
            'hank williams your cheatin heart',
            'george jones he stopped loving her today',
            'ray price heartaches by the number',
            'kitty wells making believe',
            'ferlin husky wings of a dove',
            'lefty frizzell if youve got the money',
            'faron young hello walls',
            'webb pierce in the jailhouse now'
        ],
        outlaw_country: [
            'willie nelson blue eyes crying in the rain',
            'waylon jennings luckenbach texas',
            'johnny cash folsom prison blues',
            'kris kristofferson sunday mornin comin down',
            'townes van zandt pancho and lefty',
            'merle haggard mama tried',
            'david allan coe would you lay with me',
            'jessi colter im not lisa'
        ],
        country_folk_singer_songwriter: [
            'john prine angel from montgomery',
            'emmylou harris boulder to birmingham',
            'guy clark desparados waiting for a train',
            'lucinda williams car wheels on a gravel road',
            'gillian welch look at miss ohio',
            'gram parsons brass buttons',
            'nancy griffith love at the five and dime',
            'joni mitchell coyote'
        ],
        neotraditional_80s_90s: [
            'george strait amarillos by morning',
            'randy travis forever and ever amen',
            'reba mcentire fancy',
            'alan jackson chattahoochee',
            'dwight yoakam guitars cadillacs',
            'clint black killin time',
            'patty loveless how can i help you say goodbye',
            'travis tritt help me hold on'
        ],
        '90s_2000s_mainstream': [
            'garth brooks friends in low places',
            'shania twain youre still the one',
            'faith hill breathe',
            'tim mcgraw dont take the girl',
            'dixie chicks wide open spaces',
            'brooks and dunn neon moon',
            'kenny chesney the good stuff',
            'toby keith shouldve been a cowboy'
        ],
        alt_country_americana: [
            'uncle tupelo no depression',
            'wilco box full of letters',
            'son volt windfall',
            'drive by truckers decoration day',
            'ryan adams new york new york',
            'the jayhawks blue',
            'old crow medicine show wagon wheel',
            'the avett brothers i and love and you'
        ],
        modern_country_pop_crossover: [
            'kacey musgraves slow burn',
            'sturgill simpson turtles all the way down',
            'chris stapleton tennessee whiskey',
            'maren morris my church',
            'luke combs beautiful crazy',
            'zach bryan something in the orange',
            'luke bryan country girl shake it for me',
            'morgan wallen whiskey glasses'
        ]
    };

    window.fallbackKlassikSubgenres = {
        baroque: [
            'johann sebastian bach brandenburg concerto no 3',
            'johann sebastian bach toccata and fugue in d minor',
            'antonio vivaldi the four seasons spring',
            'george frideric handel water music',
            'george frideric handel messiah hallelujah',
            'henry purcell music for the funeral of queen mary',
            'jean philippe rameau les indes galantes',
            'domenico scarlatti keyboard sonata k141'
        ],
        classical_era: [
            'wolfgang amadeus mozart eine kleine nachtmusik',
            'wolfgang amadeus mozart symphony no 40',
            'joseph haydn symphony no 94 surprise',
            'ludwig van beethoven symphony no 5',
            'ludwig van beethoven fur elise',
            'christoph willibald gluck orfeo ed euridice dance of the blessed spirits',
            'muzio clementi sonatina op 36 no 1',
            'luigi boccherini minuet'
        ],
        early_romantic: [
            'franz schubert unfinished symphony',
            'franz schubert ave maria',
            'felix mendelssohn wedding march',
            'robert schumann kinderszenen traumerai',
            'carl maria von weber invitation to the dance',
            'niccolo paganini caprice no 24',
            'hector berlioz symphonie fantastique',
            'fryderyk chopin nocturne op 9 no 2'
        ],
        romantic_late: [
            'johannes brahms hungarian dance no 5',
            'richard wagner ride of the valkyries',
            'giuseppe verdi dies irae requiem',
            'peter ilyich tchaikovsky nutcracker dance of the sugar plum fairy',
            'peter ilyich tchaikovsky swan lake theme',
            'antonin dvorak symphony no 9 new world',
            'edvard grieg peer gynt morning mood',
            'camille saint saens danse macabre'
        ],
        impressionism_modernism: [
            'claude debussy clair de lune',
            'claude debussy prelude to the afternoon of a faun',
            'maurice ravel bolero',
            'maurice ravel pavane for a dead princess',
            'erik satie gymnopedie no 1',
            'gabriel faure pavane',
            'igor stravinsky rite of spring',
            'arnold schoenberg verklarte nacht'
        ],
        early_20th_century: [
            'sergei rachmaninoff piano concerto no 2',
            'sergei prokofiev dance of the knights',
            'dmitri shostakovich symphony no 5',
            'bela bartok concerto for orchestra',
            'jean sibelius finlandia',
            'leos janacek sinfonietta',
            'kurt weill mack the knife',
            'paul hindemith symphonic metamorphosis'
        ],
        contemporary_classical: [
            'john cage 4 33',
            'philip glass glassworks opening',
            'steve reich music for 18 musicians',
            'terry riley in c',
            'arvo part spiegel im spiegel',
            'henryk gorecki symphony no 3',
            'john adams short ride in a fast machine',
            'kaija saariaho lontano'
        ],
        modern_crossover_minimal: [
            'max richter on the nature of daylight',
            'nils frahm says',
            'johann johannsson flight from the city',
            'hildur gudnadottir saman',
            'olafur arnalds near light',
            'ludovico einaudi nuvole bianche',
            'philip glass metamorphosis one',
            'rachel portman main title'
        ]
    };

    window.fallbackPunkSubgenres = {
        proto_punk: [
            'the stooges i wanna be your dog',
            'mc5 kick out the jams',
            'the velvet underground white light white heat',
            'the kinks till the end of the day',
            'the sonics psycho',
            'the seeds pushin too hard',
            'the troggs wild thing',
            'alice cooper im eighteen'
        ],
        first_wave_uk_us: [
            'ramones blitzkrieg bop',
            'sex pistols anarchy in the uk',
            'the clash white riot',
            'the damned new rose',
            'buzzcocks ever fallen in love',
            'wire 12xU',
            'x ray spex oh bondage up yours',
            'the saints im stranded'
        ],
        post_punk: [
            'joy division disorder',
            'public image ltd public image',
            'gang of four damaged goods',
            'the fall totally wired',
            'wire outdoor miner',
            'siouxsie and the banshees hong kong garden',
            'killing joke nervous system',
            'the cure a forest'
        ],
        hardcore_us: [
            'black flag rise above',
            'minor threat straight edge',
            'dead kennedys holiday in cambodia',
            'bad brains banned in dc',
            'circle jerks wild in the streets',
            'adolescents amoeba',
            'discharge protest and survive',
            'gbh city baby attacked by rats'
        ],
        melodic_punk_90s: [
            'bad religion generator',
            'nofx linoleum',
            'green day longview',
            'rancid ruby soho',
            'descendents bikeage',
            'jawbreaker accident prone',
            'samiam capsized',
            'the offspring come out and play'
        ],
        emo_post_hardcore: [
            'fugazi waiting room',
            'at the drive in one armed scissor',
            'thursday understanding in a car crash',
            'refused new noise',
            'jawbox savory',
            'helmet unsung',
            'quicksand fazed',
            'drive like jehu yank crime'
        ],
        punk_2000s_mainstream: [
            'rise against prayer of the refugee',
            'against me pints of guinness make you strong',
            'alkaline trio radio',
            'nofx franco un american',
            'hot water music trusty chords',
            'anti flag die for the government',
            'the distillers drain the blood',
            'gaslight anthem the 59 sound'
        ],
        modern_punk_revival: [
            'idles never fight a man with a perm',
            'fontaines dc boys in the better land',
            'turnstile holiday',
            'shame concrete',
            'amyl and the sniffers some mutts',
            'viagra boys sports',
            'sleaford mods jobseeker',
            'soft play punks dead'
        ]
    };

    window.fallbackIndieSubgenres = {
        post_punk_indie_roots: [
            'joy division disorder',
            'the cure a forest',
            'wire outdoor miner',
            'the fall totally wired',
            'echo and the bunnymen the cutter',
            'siouxsie and the banshees hong kong garden',
            'new order ceremony',
            'orange juice rip it up'
        ],
        indie_80s_underground: [
            'the smiths this charming man',
            'the replacements unsatisfied',
            'husker du celebrated summer',
            'sonic youth teenage riot',
            'dinosaur jr freak scene',
            'pixies where is my mind',
            'throwing muses counting backwards',
            'galaxie 500 tugboat'
        ],
        indie_90s_canon: [
            'pavement gold soundz',
            'radiohead fake plastic trees',
            'the breeders cannonball',
            'neutral milk hotel holland 1945',
            'slowdive when the sun hits',
            'blur beetlebum',
            'weezer say it aint so',
            'portishead sour times'
        ],
        indie_90s_2000s_transition: [
            'modest mouse dramamine',
            'built to spill carry the zero',
            'death cab for cutie company calls',
            'the flaming lips race for the prize',
            'yo la tengo autumn sweater',
            'mogwai mogwai fear satan',
            'sigur ros svefn g englar',
            'air sexy boy'
        ],
        indie_2000s_wave: [
            'the strokes someday',
            'interpol obstacle 1',
            'arcade fire neighborhood 1',
            'yeah yeah yeahs maps',
            'the postal service such great heights',
            'sufjan stevens chicago',
            'wilco jesus etc',
            'lcd soundsystem all my friends'
        ],
        indie_2010s_expansion: [
            'tame impala feels like we only go backwards',
            'beach house space song',
            'the national bloodbuzz ohio',
            'bon iver skinny love',
            'phoebe bridgers motion sickness',
            'mitski nobody',
            'vampire weekend harmony hall',
            'the war on drugs red eyes'
        ],
        modern_indie: [
            'big thief simulation swarm',
            'fontaines dc boys in the better land',
            'alvvays dreams tonite',
            'black country new road the place where he inserted the blade',
            'wet leg chaise longue',
            'japanese breakfast be sweet',
            'boygenius not strong enough',
            'idles never fight a man with a perm'
        ]
    };

    window.fallbackJazzSubgenres = {
        early_jazz_proto: [
            'louis armstrong west end blues',
            'jelly roll morton black bottom stomp',
            'sidney bechet petite fleur',
            'bix beiderbecke singin the blues',
            'king oliver canal street blues',
            'fats waller honeysuckle rose',
            'earl hines weather bird',
            'james p johnson carolina shout'
        ],
        swing_big_band: [
            'duke ellington take the a train',
            'count basie one oclock jump',
            'benny goodman sing sing sing',
            'glenn miller in the mood',
            'artie shaw begin the beguine',
            'ella fitzgerald a tisket a tasket',
            'cab calloway minni the moocher',
            'woody herman woodchoppers ball'
        ],
        bebop_hard_bop_roots: [
            'charlie parker ko ko',
            'dizzy gillespie a night in tunisia',
            'thelonious monk round midnight',
            'bud powell dance of the infidels',
            'max roach joy spring',
            'sonny rollins airegin',
            'clifford brown joy spring',
            'horace silver song for my father'
        ],
        cool_jazz_west_coast: [
            'miles davis so what',
            'dave brubeck take five',
            'chet baker my funny valentine',
            'stan getz focus',
            'lennie tristano line up',
            'gil evans la nevadan',
            'paul desmond glad to be unhappy',
            'modern jazz quartet django'
        ],
        modal_post_bop: [
            'john coltrane impressions',
            'wayne shorter footprints',
            'herbie hancock maiden voyage',
            'mccoy tyner passion dance',
            'joe henderson inner urge',
            'freddie hubbard red clay',
            'eric dolphy out to lunch',
            'tony williams emergency'
        ],
        free_jazz_avantgarde: [
            'ornette coleman lonely woman',
            'cecil taylor unit structures',
            'albert ayler ghosts',
            'sun ra space is the place',
            'pharoah sanders the creator has a master plan',
            'archie shepp fire music',
            'anthony braxton composition 23c',
            'art ensemble of chicago people in sorrow'
        ],
        jazz_fusion_electric: [
            'miles davis bitches brew',
            'weather report birdland',
            'herbie hancock chameleon',
            'return to forever romantic warrior',
            'mahavishnu orchestra meeting of the spirits',
            'tony williams lifetime emergency',
            'jeff beck blow by blow',
            'pat metheny group phase dance'
        ],
        spiritual_ethno_jazz: [
            'pharoah sanders karma',
            'alice coltrane journey in satchidananda',
            'don cherry brown rice',
            'yusef lateef eastern sounds',
            'abdullah ibrahim the wedding',
            'lonnie liston smith expanse',
            'sun ra lanquidity',
            'joe zawinul in a silent way'
        ],
        smooth_crossover: [
            'george benson breezin',
            'grover washington jr just the two of us',
            'bob james nautilus',
            'spyro gyra morning dance',
            'lee ritenour rio funk',
            'david sanborn chicago song',
            'ramsey lewis sun goddess',
            'chick corea spain'
        ],
        modern_jazz_acoustic: [
            'brad mehldau exit music for a film',
            'keith jarrett the koln concert part i',
            'pat metheny question and answer',
            'wynton marsalis black codes',
            'charlie haden first song',
            'joe lovano i want to talk about you',
            'fred hersch floating',
            'joshua redman jazz crimes'
        ],
        nu_jazz_future_jazz: [
            'the comet is coming summon the fire',
            'badbadnotgood time moves slow',
            'makaya mccraven in the moment',
            'kamasi washington truth',
            'sons of kemet my queen is ada eastman',
            'nubya garcia pace',
            'yussef dayes love is the message',
            'shabaka and the ancestors the ancestors'
        ]
    };

    window.fallbackTechnoSubgenres = {
        proto_techno_electro: [
            'kraftwerk numbers',
            'cybotron clear',
            'afrika bambaataa planet rock',
            'model 500 no ufo\'s',
            'cybotron alleys of your mind',
            'hashim al naafiysh',
            'newcleus jam on it',
            'the egyptian lover egypt egypt'
        ],
        detroit_first_wave: [
            'juan atkins techno city',
            'derrick may strings of life',
            'kevin saunderson big fun',
            'inner city good life',
            'rhythim is rhythim nude photo',
            'model 500 night drive',
            'mayday hand over fist',
            'eddie fowlkes goodbye kiss'
        ],
        early_rave_hardcore: [
            'joey beltram energy flash',
            'lfo lfo',
            'altern 8 activ 8',
            'the prodigy charly',
            '2 bad mice bomb scare',
            'manix hardcore junglist',
            'the future sound of london papua new guinea',
            'speedy j pullover'
        ],
        uk_techno_early_90s: [
            'orbital chime',
            'underworld dark & long',
            'leftfield not forgotten',
            'the sabres of paradise smokebelch ii',
            '808 state pacific state',
            'b12 electro soma',
            'autechre egg shell',
            'luke slater love'
        ],
        minimal_acid_90s: [
            'plastikman spastik',
            'hardfloor acperience 1',
            'dbx losing control',
            'basic channel phylyps trak',
            'aphex twin didgeridoo',
            'richie hawtin orange minus',
            'cj bolland camargue',
            'robert hood minimal nation'
        ],
        berlin_berghain_roots: [
            'surgeon badger bite',
            'regis execution',
            'jeff mills the bells',
            'dave clarke wisdom to the wise',
            'ben sims manipulate',
            'adam beyer drumcode 1',
            'chris liebing stigmata',
            'toktok missy queen'
        ],
        techno_2000s_peak: [
            'ben klock subzero',
            'marcel dettmann corebox',
            'len faki just a dance',
            'extrawelt soopertrack',
            'trentemøller moan',
            'paul kalkbrenner aaron',
            'dubfire ribcage',
            'pan pot captivate'
        ],
        dub_ambient_techno: [
            'basic channel quadrant dub',
            'deepchord dc11',
            'porter ricks biokinetics',
            'rhythm & sound never tell you',
            'monolake cyan',
            'gas königsforst',
            'barker utility',
            'detroit esc 100'
        ],
        modern_industrial_techno: [
            'paula temple colonized',
            'ansome blackwater',
            'blawan why they hide their bodies under my garage',
            'karenn pace yourself',
            'snts es ist nichts',
            'rebekah code black',
            'ancient methods knights and bishops',
            'perc look what your love has done to me'
        ],
        modern_hypnotic_techno: [
            'rene wise movers',
            'rodhad kinder der ringwelt',
            'donato dozzy vaporware',
            'nthng it never ends',
            'oscar mulero second skin',
            'shifted control',
            'planetary assault systems rip the cut',
            'jane fitz wild flower'
        ],
        new_rave_post_techno: [
            'charlotte de witte selected',
            'amelie lens stay with me',
            'i hate models daydream',
            'kobosil 110 bpm',
            'vtss body count',
            'fjaak drugs',
            'overmono so u kno',
            'bicep glue'
        ]
    };

    window.fallbackMetalSubgenres = {
        proto_heavy_metal: [
            'black sabbath paranoid',
            'led zeppelin immigrant song',
            'deep purple smoke on the water',
            'judas priest breaking the law',
            'ufo rock bottom',
            'thin lizzy jailbreak',
            'motorhead overkill',
            'scorpions virgin killer'
        ],
        nwobhm: [
            'iron maiden running free',
            'saxon denim and leather',
            'diamond head am i evil',
            'angel witch angel witch',
            'venom black metal',
            'def leppard photograph',
            'tigers of pan tang hellbound',
            'praying mantis cheetah'
        ],
        thrash_metal: [
            'metallica whiplash',
            'slayer raining blood',
            'megadeth peace sells',
            'anthrax caught in a mosh',
            'exodus bonded by blood',
            'testament over the wall',
            'kreator pleasure to kill',
            'sepultura beneath the remains'
        ],
        death_metal: [
            'death pull the plug',
            'morbid angel chapel of ghouls',
            'obituary slowly we rot',
            'entombed left hand path',
            'cannibal corpse hammer smashed face',
            'deicide dead by dawn',
            'carcass heartwork',
            'autopsy severed survival'
        ],
        black_metal: [
            'mayhem freezing moon',
            'burzum dunkelheit',
            'darkthrone transilvanian hunger',
            'emperor inno a satana',
            'immortal at the heart of winter',
            'gorgoroth funeral procession',
            'satyricon mother north',
            'bathory a fine day to die'
        ],
        doom_sludge_stoner: [
            'candlemass solitude',
            'saint vitus born too late',
            'sleep dragonaut',
            'electric wizard dopethrone',
            'eye hate god sister fucker',
            'kyuss green machine',
            'neurosis through silver in blood',
            'melvins honey bucket'
        ],
        prog_power_metal: [
            'dream theater pull me under',
            'queensryche operation mindcrime',
            'fates warning eye to eye',
            'symphony x sea of lies',
            'blind guardian mirror mirror',
            'helloween keeper of the seven keys',
            'opeth windowpane',
            'tool schism'
        ],
        nu_metal_alt_metal: [
            'korn freak on a leash',
            'deftones change in the house of flies',
            'slipknot wait and bleed',
            'system of a down chop suey',
            'limp bizkit nookie',
            'linkin park crawling',
            'disturbed down with the sickness',
            'faith no more epic'
        ],
        modern_extreme_metal: [
            'meshuggah bleed',
            'gojira flying whales',
            'mastodon oblivion',
            'behemoth ov fire and the void',
            'lamb of god laid to rest',
            'between the buried and me selkies',
            'deafheaven dream house',
            'power trip executioners tax'
        ]
    };
})();
