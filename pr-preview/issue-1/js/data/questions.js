// Banco de perguntas do site (funciona sem IA). Explicações em português.
// mc(pergunta, certa, [erradas], explicação)  — as opções são baralhadas na prática.
// gap(pergunta, [respostas aceites], explicação)
const mc = (q, answer, wrong, explain) => ({ type: 'mc', q, answer, options: [answer, ...wrong], explain });
const gap = (q, answers, explain) => ({ type: 'gap', q, answers, explain });

export const BANK = {
  future: [
    mc('Look at those black clouds! It ____ rain.', 'is going to', ['will', 'is raining', 'rains'], 'Há evidência no presente (nuvens negras) → be going to.'),
    mc("I can't come on Saturday. I ____ my grandparents.", 'am visiting', ['visit', 'will visit', 'visits'], 'Combinação já marcada → present continuous.'),
    gap('The train ____ (leave) at 7.45 tomorrow morning.', ['leaves'], 'Horários/timetables → present simple.'),
    mc("A: There's no milk. B: Oh, I ____ some from the shop.", "'ll get", ['am getting', 'get', 'got'], 'Decisão espontânea, no momento → will.'),
    mc('I think Portugal ____ the match tonight.', 'will win', ['is winning', 'wins', 'won'], 'Opinião/previsão com "I think" → will.'),
    gap("Don't phone at eight. I ____ (have) dinner with my parents.", ['am having', "'m having"], 'Plano combinado → present continuous.'),
    mc("She ____ be late, but I'm not sure.", 'might', ['is going to', 'does', 'is'], 'Possibilidade incerta → might.'),
    mc('We ____ a party next Friday. Would you like to come?', 'are having', ['have', 'are have', 'will having'], 'Arranjo já organizado → present continuous.'),
    gap("If it ____ (rain) tomorrow, we'll stay at home.", ['rains'], 'Depois de if/when usa-se present simple, não will.'),
    gap("I'll tell him when I ____ (see) him.", ['see'], 'Orações de tempo (when, as soon as, before) → present simple.'),
    mc('Wait! I ____ help you with those bags.', "'ll", ['am going to', 'am helping', 'help'], 'Oferta espontânea → will.'),
    mc("He's saved £500. He ____ buy a new phone.", 'is going to', ['will', 'buys', 'might to'], 'Intenção/plano já decidido → be going to.'),
    mc('What time ____ the film start?', 'does', ['will', 'is going', 'is'], 'Horário de cinema → present simple ("does ... start").'),
    gap("I'm not sure, but I think it ____ (be) sunny at the weekend.", ['will be', "'ll be"], 'Previsão com "I think" → will.'),
  ],

  'pp-ps': [
    mc('I ____ to Paris in 2019.', 'went', ['have been', 'have gone', 'was going'], 'Tempo terminado e definido (in 2019) → past simple.'),
    mc("She ____ her keys. She can't get in.", 'has lost', ['lost', 'loses', 'is losing'], 'Resultado presente de uma ação recente → present perfect.'),
    gap('We ____ (live) here since 2015.', ['have lived', "'ve lived"], 'since + ponto no tempo, situação que continua → present perfect.'),
    mc('I ____ him yesterday.', 'saw', ['have seen', 'see', 'have saw'], 'yesterday → past simple.'),
    mc('____ you ever eaten sushi?', 'Have', ['Did', 'Do', 'Are'], 'ever (experiência de vida) → present perfect.'),
    gap("He ____ (not/finish) his homework yet.", ["hasn't finished", 'has not finished'], 'yet em frases negativas → present perfect.'),
    mc('How long ____ she known Tom?', 'has', ['did', 'is', 'does'], 'How long + situação que continua → present perfect.'),
    mc('I ____ my phone this morning, but I found it later.', 'lost', ['have lost', 'was lost', 'lose'], 'Ação acabada e já resolvida → past simple.'),
    gap('My brother ____ (just/call) me.', ['has just called', "'s just called"], 'just → present perfect.'),
    mc('They ____ married for ten years.', 'have been', ['were', 'are being', 'was'], 'Ainda estão casados → present perfect.'),
    mc('We ____ a great film last night.', 'watched', ['have watched', 'watch', 'were watching'], 'last night → past simple.'),
    mc('Which sentence is correct?', 'When did you buy that jacket?', ['When have you bought that jacket?', 'When you bought that jacket?', 'When do you bought that jacket?'], 'When + momento específico do passado → past simple.'),
    mc("I've never ____ to Scotland.", 'been', ['went', 'go', 'being'], 'have never + past participle de be → been.'),
    gap('She ____ (not/see) him last week.', ["didn't see", 'did not see'], 'last week → past simple (didn\'t + verbo base).'),
  ],

  mixed: [
    mc("I ____ my homework yet, so I can't go out.", "haven't done", ["didn't do", "won't do", "don't do"], 'yet → present perfect.'),
    mc('Tomorrow I ____ my aunt at the airport.', 'am meeting', ['met', 'have met', 'meet'], 'Plano combinado → present continuous.'),
    mc('Last summer we ____ to Cornwall.', 'went', ['have been', 'are going', 'go'], 'Last summer → past simple.'),
    mc('Look! He ____ fall off his bike!', 'is going to', ['has', 'will to', 'fell'], 'Evidência imediata → be going to.'),
    mc('I ____ in London for three years now.', 'have lived', ['lived', 'will live', 'am living to'], 'for + período até agora → present perfect.'),
    mc("A: I'm cold. B: I ____ the window.", "'ll close", ['am going to close', 'have closed', 'closed'], 'Decisão espontânea → will.'),
    gap('Shakespeare ____ (write) Hamlet around 1600.', ['wrote'], 'Tempo passado definido → past simple.'),
    gap('I think she ____ (pass) the exam. She works so hard.', ['will pass', "'ll pass"], 'Previsão → will.'),
    mc('This is the best book I ____ ever read.', 'have', ['did', 'will', 'am'], 'Superlativo + ever → present perfect.'),
    mc('The concert ____ at 8 p.m. tomorrow.', 'starts', ['started', 'has started', 'is starting to'], 'Horário/programa → present simple.'),
    gap('I ____ (never/eat) snails.', ['have never eaten', "'ve never eaten"], 'never (experiência) → present perfect.'),
    mc('She ____ the job last month.', 'got', ['has got', 'will get', 'gets'], 'last month → past simple.'),
    mc('Be careful, or you ____ the glass!', 'will break', ['broke', 'have broken', 'are broken'], 'Aviso/consequência → will.'),
    gap("Next year I ____ (go) to university. I've already applied.", ['am going to go', "'m going to go", 'am going', "'m going"], 'Plano/intenção → be going to (ou present continuous).'),
  ],

  food: [
    mc('In British English, thin fried slices of potato sold in a packet are called ____.', 'crisps', ['chips', 'fries', 'wedges'], 'UK: crisps. (US: chips)'),
    mc('In Britain, hot, thick fried sticks of potato are called ____.', 'chips', ['crisps', 'biscuits', 'pancakes'], 'UK: chips. (US: fries)'),
    mc('A long green vegetable, similar to a cucumber, called "zucchini" in the US:', 'courgette', ['aubergine', 'cabbage', 'leek'], 'UK: courgette.'),
    mc('What do Americans call an "aubergine"?', 'eggplant', ['zucchini', 'pepper', 'turnip'], 'UK aubergine = US eggplant.'),
    mc('What do Americans call a British "biscuit"?', 'cookie', ['cracker', 'scone', 'muffin'], 'UK biscuit = US cookie.'),
    mc('A person who does not eat meat or fish is a ____.', 'vegetarian', ['vegan', 'carnivore', 'chef'], 'Vegetarian não come carne nem peixe (vegan não come nada de origem animal).'),
    mc('Food with a lot of chilli is ____.', 'spicy', ['sour', 'bitter', 'salty'], 'spicy = picante.'),
    mc('Lemons taste ____.', 'sour', ['sweet', 'spicy', 'bland'], 'sour = azedo.'),
    gap('Cakes and bread are ____ (cook) in the oven.', ['baked'], 'bake = cozer no forno.'),
    mc('You ____ an egg in boiling water.', 'boil', ['grill', 'roast', 'bake'], 'boil = ferver.'),
    gap('A ____ of bread is a whole bread that you cut into slices. (l_____)', ['loaf'], 'a loaf of bread.'),
    mc('Can we have the ____, please? (at the end of a meal in a restaurant, UK)', 'bill', ['check', 'ticket', 'receipt'], 'UK: the bill (US: the check).'),
    mc('A ____ of chocolate.', 'bar', ['slice', 'loaf', 'jar'], 'a bar of chocolate; a slice of cake; a jar of jam.'),
    gap("I'm ____! I haven't eaten all day.", ['starving', 'hungry'], 'starving = com muita fome.'),
  ],

  family: [
    mc("Your mother's brother is your ____.", 'uncle', ['nephew', 'cousin', 'grandfather'], 'uncle = tio.'),
    mc("Your uncle's children are your ____.", 'cousins', ['nephews', 'siblings', 'in-laws'], 'cousin = primo(a).'),
    mc("Your husband's mother is your ____.", 'mother-in-law', ['stepmother', 'grandmother', 'aunt'], 'in-law = por casamento.'),
    mc("Your brother's daughter is your ____.", 'niece', ['nephew', 'cousin', 'aunt'], 'niece = sobrinha; nephew = sobrinho.'),
    mc('British informal word for "mother":', 'mum', ['mom', 'mommy', 'madre'], 'UK: mum. (US: mom)'),
    mc("Your sister's son is your ____.", 'nephew', ['niece', 'cousin', 'uncle'], 'nephew = sobrinho.'),
    mc('The man who is married to your sister is your ____.', 'brother-in-law', ['stepbrother', 'half-brother', 'cousin'], 'brother-in-law = cunhado.'),
    gap('She has no brothers or sisters. She is an ____ child.', ['only'], 'only child = filho único.'),
    mc('My mum remarried. Her new husband is my ____.', 'stepfather', ['father-in-law', 'godfather', 'uncle'], 'step- = família por segundo casamento.'),
    mc('Two babies born at the same time to the same mother are ____.', 'twins', ['siblings', 'relatives', 'cousins'], 'twins = gémeos.'),
    mc('Your parents and brothers/sisters are your ____ family.', 'immediate', ['extended', 'distant', 'foreign'], 'immediate/nuclear family. Extended family = tios, primos, avós...'),
    gap('She looks just like her mother. She takes ____ her.', ['after'], 'take after = parecer-se / sair a.'),
    gap('I get ____ really well with my sister.', ['on'], 'get on (well) with = dar-se bem com.'),
    mc('Brothers and sisters are called ____.', 'siblings', ['relatives', 'in-laws', 'ancestors'], 'siblings = irmãos (em geral).'),
  ],

  personality: [
    mc('Someone who always tells the truth is ____.', 'honest', ['reliable', 'generous', 'shy'], 'honest = honesto.'),
    mc("A person who doesn't like spending or giving money is ____. (UK)", 'mean', ['kind', 'generous', 'easy-going'], 'mean (UK) = forreta. Opposite: generous.'),
    mc('Someone who enjoys meeting and talking to new people is ____.', 'outgoing', ['shy', 'lazy', 'moody'], 'outgoing / sociable = extrovertido.'),
    mc('A person who gets angry very easily is ____.', 'bad-tempered', ['easy-going', 'patient', 'cheerful'], 'bad-tempered = mal-humorado.'),
    mc('Someone who gives a lot of money, time or presents is ____.', 'generous', ['mean', 'selfish', 'rude'], 'generous = generoso.'),
    mc("Someone who doesn't like working or making an effort is ____.", 'lazy', ['ambitious', 'hard-working', 'creative'], 'lazy = preguiçoso.'),
    mc('The opposite of "polite" is ____.', 'rude', ['kind', 'shy', 'clever'], 'rude = mal-educado.'),
    mc("A person who feels nervous with other people and doesn't talk much is ____.", 'shy', ['outgoing', 'arrogant', 'bossy'], 'shy = tímido.'),
    mc('Someone who really wants to be successful and works hard for it is ____.', 'ambitious', ['lazy', 'easy-going', 'careless'], 'ambitious = ambicioso.'),
    gap('You can depend on her. She always does what she promises. She is very ____.', ['reliable'], 'reliable = de confiança.'),
    mc('A person who always expects good things to happen is ____.', 'optimistic', ['pessimistic', 'sensible', 'moody'], 'optimistic ↔ pessimistic.'),
    mc('Someone who thinks they are better than other people is ____.', 'arrogant', ['modest', 'friendly', 'patient'], 'arrogant = arrogante (UK informal: big-headed). Opposite: modest.'),
    mc('Someone who is relaxed and does not worry about small things is ____.', 'easy-going', ['bad-tempered', 'bossy', 'ambitious'], 'easy-going = descontraído.'),
    gap('He always makes everyone laugh. He is so ____.', ['funny', 'witty'], 'funny = engraçado.'),
  ],

  money: [
    mc('The money you earn every month from your job is your ____.', 'salary', ['bill', 'refund', 'rent'], 'salary = ordenado (monthly); wages = pago por hora/semana.'),
    mc('To take money out of your bank account at a cash machine, you ____ it.', 'withdraw', ['deposit', 'lend', 'owe'], 'withdraw = levantar; deposit = depositar.'),
    mc("Can I ____ £10 from you? I'll pay you back on Friday.", 'borrow', ['lend', 'owe', 'save'], 'borrow = pedir emprestado; lend = emprestar.'),
    mc('Could you ____ me £10 until Friday?', 'lend', ['borrow', 'earn', 'waste'], 'lend = emprestar (a alguém).'),
    mc("I can't go out tonight. I'm ____ until the end of the month.", 'broke', ['rich', 'worth', 'cheap'], 'broke (informal) = sem dinheiro.'),
    mc('British informal word for "pound":', 'quid', ['buck', 'penny', 'cent'], '£5 = five quid (informal UK).'),
    gap('How much does this ticket ____?', ['cost'], 'cost = custar.'),
    mc('A card that takes money directly from your bank account is a ____ card.', 'debit', ['credit', 'loyalty', 'business'], 'debit card ↔ credit card.'),
    mc('If you return a faulty product, the shop gives you a ____.', 'refund', ['salary', 'tip', 'rent'], 'refund = reembolso.'),
    mc('"Keep the ____." (when you pay with a note and do not want the coins back)', 'change', ['rent', 'bill', 'refund'], 'change = troco.'),
    mc('In the UK, another word for ATM is ____.', 'cashpoint', ['cashbox', 'bank card', 'wallet'], 'cash machine / cashpoint (UK).'),
    mc('This jacket was only £10. What a ____!', 'bargain', ['salary', 'loan', 'receipt'], 'bargain = pechincha.'),
    gap("I'm saving ____ for a new laptop.", ['up'], 'save up for = juntar dinheiro para.'),
    gap('I paid ____ cash. (in / by / with)', ['in'], 'pay in cash (mas pay by card).'),
  ],
};

// Textos de leitura do site (compreensão). 6 perguntas por texto.
export const READINGS = [
  {
    title: 'A weekend in Edinburgh',
    text: `Last month, my sister Emma and I spent a weekend in Edinburgh. We took the train from London on Friday evening and arrived at about eleven o'clock. Our hotel was small, but it was cheap and only ten minutes' walk from the station.

On Saturday morning we climbed Arthur's Seat, an old volcano in the middle of the city. It was a bit windy, but the view from the top was fantastic. In the afternoon we visited the castle, which was much more crowded than we expected. Emma wanted to buy a souvenir, but everything was expensive, so she only bought a postcard.

In the evening we had dinner in a traditional pub. I had fish and chips, and Emma, who is a vegetarian, ordered a vegetable pie. Then we listened to a band playing folk music. We went to bed very late.

On Sunday it rained all day, so we stayed in a café and read our books. We caught the train home at six o'clock. I'm already planning to go back next year, and this time I'm going to stay longer.`,
    questions: [
      mc('How did the writer and Emma travel to Edinburgh?', 'By train', ['By plane', 'By car', 'By coach'], 'O texto diz "We took the train from London".'),
      mc('What was the hotel like?', 'Small and cheap', ['Big and luxurious', 'Expensive but central', 'Far from the station'], '"small, but cheap and ten minutes\' walk from the station".'),
      mc('What did they do on Saturday morning?', "They climbed Arthur's Seat", ['They visited the castle', 'They went shopping', 'They stayed at the hotel'], 'Saturday morning → Arthur\'s Seat.'),
      mc('Why did Emma only buy a postcard?', 'Everything was expensive', ['She had no money', 'The shop was closed', 'She did not like souvenirs'], '"everything was expensive, so she only bought a postcard".'),
      mc('What did Emma eat for dinner?', 'A vegetable pie', ['Fish and chips', 'A pizza', 'A salad'], 'Emma is vegetarian → vegetable pie.'),
      mc('What does the writer plan to do next year?', 'Go back and stay longer', ['Visit London', 'Go to Scotland by car', 'Stay for the same time'], '"I\'m going to stay longer".'),
    ],
  },
  {
    title: 'My neighbour, Mr Davies',
    text: `Mr Davies has lived next door to us for more than thirty years. He's seventy-two, but he's very active. Every morning he goes jogging in the park at seven o'clock, whatever the weather. He says that exercise is the secret of a long life.

He used to be a teacher, and he still loves helping young people. Last year he started giving free English lessons to refugees at the local library. Many of his students have become good friends, and they often invite him to their homes for dinner.

Mr Davies isn't rich, but he's one of the most generous people I know. When our washing machine broke down, he lent us his for two weeks. He also grows vegetables in his garden and gives them away to anyone who wants them.

He has never been married, and he has no children, but he says he has a huge family: "all the people I've met along the way". Next month he's going to travel to Poland to meet one of his former students. It will be his first trip abroad in ten years.`,
    questions: [
      mc('How long has Mr Davies lived next door?', 'More than thirty years', ['Ten years', 'Seventy-two years', 'Two years'], '"for more than thirty years".'),
      mc('What does Mr Davies do every morning?', 'He goes jogging', ['He teaches English', 'He grows vegetables', 'He travels abroad'], '"Every morning he goes jogging in the park".'),
      mc('What was his job before?', 'He was a teacher', ['He was a gardener', 'He was a doctor', 'He was a librarian'], '"He used to be a teacher".'),
      mc('Where does he give English lessons?', 'At the local library', ['At his house', 'At a school', 'In the park'], '"at the local library".'),
      mc('Which adjective best describes him?', 'Generous', ['Mean', 'Shy', 'Bad-tempered'], 'Empresta a máquina, dá legumes → generous.'),
      mc('What is he going to do next month?', 'Visit a former student in Poland', ['Retire', 'Give lessons in Poland', 'Buy a washing machine'], '"he\'s going to travel to Poland to meet one of his former students".'),
    ],
  },
];

// Temas de composição (o tópico 9 do teste é o primeiro).
export const WRITING_PROMPTS = [
  {
    id: 'friend',
    title: 'Write about a friend of yours',
    min: 100, max: 140,
    hints: ['Who is your friend and how did you meet?', 'What does he/she look like?', 'What is his/her personality like?', 'What do you do together?', 'Why is this person special to you?'],
  },
];
