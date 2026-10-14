// Bay City's population: 1,000 named people who live here, every game. Each has a home, a job, a daily routine,
// an attitude and people they know (partners, best friends, siblings). Around 60 of them are story characters with a
// history and a chain of favours they'll ask you for. The registry is generated from a fixed seed, so Marisol is always
// Marisol, always runs the taco truck and always owes the Kings money; only how she feels about YOU is saved.

const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const FM = ['James', 'Marcus', 'Leo', 'Andre', 'Tyler', 'Diego', 'Ethan', 'Malik', 'Owen', 'Hugo', 'Ravi', 'Kenji', 'Luca', 'Omar', 'Felix', 'Jamal', 'Noah', 'Caleb', 'Mateo', 'Darius', 'Sam', 'Theo', 'Isaac', 'Rico', 'Jonah', 'Elijah', 'Kai', 'Nate', 'Vince', 'Troy', 'Wes', 'Abdul', 'Ivan', 'Pablo', 'Reggie', 'Dmitri', 'Kwame', 'Finn', 'Arjun', 'Tomas',
  'Callum', 'Rory', 'Declan', 'Hassan', 'Yusuf', 'Kofi', 'Jin', 'Hiro', 'Sanjay', 'Mikey', 'Dante', 'Rafael', 'Bruno', 'Cyrus', 'Elliot', 'Gabe', 'Harvey', 'Jasper', 'Kieran', 'Lewis', 'Miles', 'Nico', 'Oscar', 'Percy', 'Quinn', 'Reuben', 'Silas', 'Tariq', 'Umar', 'Victor', 'Wade', 'Xavier', 'Yosef', 'Zane', 'Ade', 'Bilal', 'Cosmo', 'Dev', 'Emeka', 'Frankie'];
const FF = ['Jade', 'Mia', 'Sofia', 'Chloe', 'Lexi', 'Nina', 'Ava', 'Zoe', 'Maya', 'Bella', 'Kira', 'Luna', 'Rosa', 'Tasha', 'Gabi', 'Leah', 'Imani', 'Priya', 'Yuki', 'Carmen', 'Brooke', 'Skye', 'Dana', 'Erin', 'Fatima', 'Grace', 'Holly', 'Iris', 'Jasmine', 'Kayla', 'Lola', 'Megan', 'Naomi', 'Olivia', 'Paige', 'Ruby', 'Sasha', 'Tia', 'Vera', 'Willow',
  'Amara', 'Bianca', 'Cleo', 'Daisy', 'Esme', 'Freya', 'Gemma', 'Hana', 'Ines', 'Jules', 'Keisha', 'Lina', 'Marisol', 'Nell', 'Orla', 'Penny', 'Qiana', 'Rhea', 'Selin', 'Tamsin', 'Uma', 'Valentina', 'Wren', 'Ximena', 'Yara', 'Zara', 'Abi', 'Bex', 'Coco', 'Delia', 'Eden', 'Farah', 'Greta', 'Hope', 'Ivy', 'Joy', 'Kat', 'Liv', 'Mo', 'Nadia'];
const LN = ['Johnson', 'Garcia', 'Nguyen', 'Kim', 'Patel', 'Lopez', 'Brown', 'Okafor', 'Silva', 'Murphy', 'Rossi', 'Chen', 'Walker', 'Rivera', 'Haddad', 'Novak', 'Reyes', 'Santos', 'Brooks', 'Diaz', 'Cole', 'Ward', 'Price', 'Fox', 'Mendoza', 'Hayes', 'Bennett', 'Park', 'Yamada', 'Costa', 'Ali', 'Khan', 'Osei', 'Mensah', 'Dubois', 'Moreau', 'Fischer', 'Weber', 'Kowalski', 'Ivanova',
  'Petrov', 'Hansen', 'Larsen', 'Berg', "O'Neill", 'Byrne', 'Doyle', 'Quinn', 'Hughes', 'Evans', 'Jones', 'Davies', 'Clarke', 'Lewis', 'Wright', 'Green', 'Hall', 'Wood', 'Hill', 'Baker', 'Turner', 'Cooper', 'Morgan', 'Bell', 'Cook', 'Kelly', 'Adeyemi', 'Balogun', 'Nwosu', 'Abara', 'Tanaka', 'Sato', 'Watanabe', 'Ito', 'Suzuki', 'Wong', 'Liu', 'Huang', 'Zhao', 'Lin',
  'Sharma', 'Singh', 'Gupta', 'Das', 'Rahman', 'Hussain', 'Aziz', 'Farouk', 'Navarro', 'Romero', 'Torres', 'Vargas', 'Castillo', 'Ortega', 'Delgado', 'Morales', 'Ferreira', 'Almeida', 'Rocha', 'Barros', 'Esposito', 'Bianchi', 'Romano', 'Greco', 'Marino', 'Conti', 'Moretti', 'Sorensen', 'Lindqvist', 'Nielsen', 'Jansen', 'De Vries', 'Bakker', 'Visser'];

// jobs: what they say, where they work (an interior of a real place, or an outdoor spot), and their shift
export const CIT_JOBS = [
  ['barista', 'I make coffee at the diner.', 'diner'], ['cook', 'Line cook at the diner. Long shifts.', 'diner'], ['cashier', 'Tills at QuickMart.', 'mart'], ['shelf', 'I stack shelves at QuickMart. Glamorous.', 'mart'],
  ['bartender', 'I tend bar. I hear everything.', 'bar'], ['bouncer', 'Door at the club. Nobody gets past me.', 'club'], ['dj', 'I DJ at the club, weekends.', 'club'], ['trainer', 'Personal trainer at the gym.', 'gym'],
  ['nurse', 'Nurse at Bay General. Nights, mostly.', 'hospital'], ['doctor', 'Doctor. Bay General.', 'hospital'], ['officer', 'I\'m a police officer. Off duty, relax.', 'police'], ['clerk', 'Office job at Bay Corp. Spreadsheets.', 'office'],
  ['analyst', 'Financial analyst. Bay Corp Tower.', 'office'], ['lawyer', 'I\'m a lawyer. Don\'t tell me anything incriminating.', 'office'], ['teacher', 'I teach at the college.', 'college'], ['student', 'I\'m studying at the college.', 'college'],
  ['stylist', 'I cut hair. Want a trim?', 'barber'], ['tattooist', 'Tattoo artist. Skin is my canvas.', 'tattoo'], ['dealer', 'Croupier at the casino.', 'casino'], ['priest', 'I help out at the chapel.', 'church'],
  ['shopgirl', 'I work in a clothes shop at the mall.', 'mall'], ['sales', 'Car sales at Bay Motors.', 'motors'], ['laundry', 'I run washes at the laundrette.', 'laundry'], ['burger', 'Flipping burgers. Free fries though.', 'burgershop'],
  ['builder', 'Building sites. Wherever the work is.', null], ['courier', 'Bike courier. I know every shortcut.', null], ['cabbie', 'I drive a cab. Seen it all.', null], ['dockhand', 'I work the docks in Eastport.', null],
  ['artist', 'I paint. Murals mostly.', null], ['musician', 'Musician. Busking pays the rent... nearly.', null], ['retired', 'Retired. I walk the dog and complain about the council.', null], ['unemployed', 'Between jobs. Don\'t ask.', null],
  ['farmer', 'Farm out past Eastport. Up at five every day.', null], ['influencer', 'I\'m a content creator. You should follow me.', null], ['mechanic', 'Mechanic. Bay Customs.', 'mods'], ['realtor', 'Estate agent. Looking to buy?', 'office'],
];
const EVENINGS = ['bar', 'gym', 'park', 'home', 'home', 'club', 'beach', 'diner', 'casino', 'mall'];

// the story people: who they are, the trouble they're in, and the favours they'll ask (each favour sends you somewhere)
// [first, last, fem, job key, bio, [favour asks...], reward]
export const STORY = [
  ['Marisol', 'Vega', 1, 'cook', 'Runs the taco truck. Owes the wrong people money.', ['The Kings want their money by Friday. Could you drop this envelope at the Anchor Bar? I can\'t go myself.', 'They want more. A bag at the pier, behind the bait shop. Please.', 'It\'s done, I paid them off. One last thing: bring this to my sister at the diner. Tell her I\'m safe.'], 600],
  ['Ray', 'Holt', 0, 'officer', 'Detective. Tired, honest, watching the dealers.', ['There\'s a witness at the casino who won\'t talk to cops. Go have a word. Unofficially.', 'Someone\'s tipping off the dealers. Leave this note at the police station desk, say it\'s from "a friend".', 'We got him. A bent sergeant. Meet me at the chapel. I want to thank you properly.'], 1200],
  ['Tamsin', 'Clarke', 1, 'artist', 'Paints murals at night. Wants the city to look alive.', ['I need spray paint from the mall. Can you pick some up and meet me there?', 'Can you be lookout while I paint the wall by the laundrette?', 'The council saw my mural and want me to paint the whole underpass. Come see it at the mall!'], 400],
  ['Kofi', 'Mensah', 0, 'dockhand', 'Docks worker with a gambling problem.', ['I\'m in deep at the casino. Go tell them I\'ll pay Monday. They like you.', 'They want collateral. Drop my watch at the pawn guy behind the bar.', 'I\'m done gambling. Swear. Come to the gym with me, I\'m starting over.'], 500],
  ['Grace', 'Okafor', 1, 'nurse', 'Night nurse at Bay General. Running on coffee.', ['A patient left without his meds. Can you take them to him at the laundrette?', 'We\'re short on blood donors. Go to the hospital, roll your sleeve up?', 'Bring me a coffee from the diner. I\'ve been on for 14 hours.'], 300],
  ['Dante', 'Rossi', 0, 'bartender', 'Bartender at the Anchor. Knows everyone\'s business.', ['A regular left his wallet. He\'s at the casino. Return it?', 'Someone\'s been watering down the vodka. Go ask the supplier at QuickMart what\'s going on.', 'Turns out it was my cousin. Family, eh? Come by the bar, drinks are on me.'], 450],
  ['Esme', 'Dubois', 1, 'student', 'Law student, broke, brilliant.', ['My textbooks are at the college library. Can you grab them? I\'m stuck at work.', 'My landlord is trying to keep my deposit. Deliver this letter to the office tower.', 'I passed my exams! Celebration at the club, you\'re coming.'], 350],
  ['Mikey', 'Byrne', 0, 'cabbie', 'Cabbie who drove the wrong passenger once.', ['A guy left a briefcase in my cab. Too scared to open it. Drop it at the police station?', 'The guy came back. He wants his case. Meet him at the pier, I\'ll owe you forever.', 'He paid me to forget I saw him. Here\'s half. Meet me at the diner.'], 900],
  ['Selin', 'Aziz', 1, 'stylist', 'Barber with big plans and a small shop.', ['I want to open a second shop. Go check out the empty unit near the mall for me?', 'I need a loan signed off at the office tower. Drop the papers?', 'We\'re open! Come to the barber for the grand opening. Free cut.'], 500],
  ['Hugo', 'Fischer', 0, 'retired', 'Retired sailor with stories nobody believes.', ['My old boat\'s been impounded at the marina. Go see what it costs to get her back?', 'There\'s a box of my old letters at the pier shack. Fetch them?', 'I found the map. There\'s something buried at the beach. Meet me there.'], 1500],
  ['Kira', 'Tanaka', 1, 'influencer', 'Influencer chasing her big break.', ['I need a photographer at the beach at sunset. You?', 'A brand wants me at the club tonight but I need a plus one. Come?', 'I hit a million followers! Come to the mall, I\'m doing a meet and greet.'], 400],
  ['Bilal', 'Hussain', 0, 'mechanic', 'Mechanic who builds race cars in secret.', ['I need a part from Bay Motors. Pick it up for me?', 'Test drive day. Meet me at the race track.', 'We won the street race! Party at the garage. Come through.'], 800],
  ['Rosa', 'Navarro', 1, 'teacher', 'Teacher worried about a kid in her class.', ['One of my students is mixed up with the gangs. He hangs at the burger place. Talk to him?', 'He wants out. Help me get him to the college for a scholarship interview?', 'He got the scholarship. Come to the college, he wants to thank you.'], 300],
  ['Vince', 'Moretti', 0, 'sales', 'Car salesman. Smile like a shark.', ['A customer stopped paying for his car. Swing by the casino and remind him?', 'I need a car delivered to a client by the marina. Easy money.', 'Turns out the car was stolen. Not my fault! Meet me at the bar, I need an alibi.'], 1000],
  ['Freya', 'Larsen', 1, 'trainer', 'Personal trainer training for a big fight.', ['I need a sparring partner. Gym, now?', 'My coach quit. Can you hold the pads at the gym tomorrow?', 'Fight night! Come to the pit and cheer me on.'], 350],
  ['Omar', 'Farouk', 0, 'laundry', 'Runs the laundrette. Launders more than shirts.', ['There\'s a bag in machine six. Take it to the bar, ask for Dante.', 'Someone\'s been asking questions. Go see who\'s parked outside the police station.', 'All clear. Come by the laundrette. Your washes are free for life.'], 1100],
  ['Imani', 'Osei', 1, 'priest', 'Runs the chapel soup kitchen.', ['We\'re short on food. Can you pick up groceries at QuickMart?', 'A man sleeping by the pier needs a coat. Bring him one from the mall?', 'The kitchen has a new roof thanks to you. Come to the chapel for the blessing.'], 200],
  ['Jasper', 'Bell', 0, 'musician', 'Busker who swears he\'s about to make it.', ['I left my guitar at the club. Grab it for me?', 'There\'s a record label guy at the casino tonight. Tell him to come see me play?', 'He signed me! Come see my first real gig at the club.'], 600],
  ['Nell', 'Doyle', 1, 'realtor', 'Estate agent who knows which houses are cursed.', ['There\'s a viewing at the beach house. Can you open up for me?', 'A buyer wants a second look at the hangar by the airport. Meet them?', 'Big sale! Come to the office tower, I\'ll show you a place you\'ll love.'], 700],
  ['Tariq', 'Rahman', 0, 'courier', 'Bike courier who saw something he shouldn\'t.', ['I dropped a package at the wrong address. Get it back from the laundrette?', 'The guy whose package it was wants to meet. At the pier. Come with me?', 'Turns out he just wanted to tip me. $200! Meet me at the burger place, I\'m buying.'], 300],
  ['Valentina', 'Romero', 1, 'dealer', 'Croupier who counts cards in her sleep.', ['A high roller is cheating at my table. Find out who he is at the bar?', 'He\'s staying at the beach house. Take a look around?', 'Casino banned him. My boss gave me a bonus. Drinks at the casino!'], 800],
  ['Reggie', 'Cole', 0, 'bouncer', 'Bouncer, gentle giant, writes poetry.', ['I wrote a poem for a girl at the diner. Give it to her? I\'m too shy.', 'She wants to meet me! At the park. Come for moral support?', 'We\'re together. Come to the club, I\'ll get you in VIP.'], 300],
  ['Yara', 'Haddad', 1, 'doctor', 'Surgeon by day, street racer by night.', ['I need a fast car for tonight. Meet me at Bay Motors?', 'Cops are onto the race. Go check if the police station is busy?', 'Clean getaway. Come to the hospital, I\'ll patch up your car on my lunch break. Kidding. Mostly.'], 900],
  ['Callum', 'Murphy', 0, 'builder', 'Builder who found something in a wall.', ['Found an old safe in a wall I knocked down. Get it to the laundrette before the boss sees?', 'Can\'t open it. There\'s a locksmith who drinks at the bar. Ask him?', 'Gold coins! We split it. Meet me at the pier.'], 1400],
  ['Delia', 'Ortega', 1, 'shopgirl', 'Mall shop girl saving to leave town.', ['Someone keeps shoplifting from my shop. Keep an eye out at the mall?', 'It\'s my manager stealing. Take the CCTV tape to the police station?', 'Manager\'s gone, I\'m the new manager! Come to the mall, staff discount.'], 400],
  ['Kwame', 'Adeyemi', 0, 'farmer', 'Farmer whose cows keep escaping.', ['A cow got into town! Last seen near the park.', 'The fence needs wire from Bay Motors\' yard. Grab some?', 'Fence is fixed. Come to the farm, I\'ll show you round.'], 300],
  ['Hana', 'Sato', 1, 'analyst', 'Analyst who found fraud in the books.', ['I found something in the accounts. Take this file to the police station?', 'My boss knows. Meet me at the diner, I don\'t feel safe.', 'He\'s been arrested. Come to the office tower, I got promoted!'], 1000],
  ['Frankie', 'Esposito', 0, 'unemployed', 'Lovable chancer with a new scheme every week.', ['I\'m selling "designer" watches. Help me set up at the market by the mall?', 'Okay they were fake. Go apologise to the guy at the bar I sold one to?', 'I got a real job! Come to the burger place, I\'m on fries.'], 200],
  ['Wren', 'Hughes', 1, 'tattooist', 'Tattoo artist covering up an ex\'s name for half the city.', ['I need new ink from the mall. Pick some up?', 'A client never paid. He\'s at the gym. Remind him?', 'Shop\'s busier than ever. Come by, first tattoo on me.'], 400],
  ['Theo', 'Price', 0, 'lawyer', 'Lawyer with expensive habits.', ['Deliver these papers to the police station. Don\'t read them.', 'My client needs bail money taken to the station. Discreetly.', 'Case dismissed. Come to the casino, I\'m celebrating.'], 1200],
  ['Ruby', 'Turner', 1, 'cashier', 'QuickMart cashier who wants to be a singer.', ['There\'s an open mic at the club. Sign me up? I\'m too nervous.', 'I need a dress for it. Meet me at the clothes shop?', 'I sang! They want me back! Come to the club next week.'], 300],
  ['Sanjay', 'Sharma', 0, 'clerk', 'Office clerk running a secret supper club.', ['I need fresh spices from QuickMart for tonight. Grab some?', 'A food critic is coming. Make sure the diner doesn\'t poach him first?', 'Five stars! Come to the diner, dinner is on me.'], 400],
  ['Orla', 'Quinn', 1, 'bartender', 'Club bartender who knows where the after-party is.', ['Bring ice from QuickMart, we\'ve run out!', 'Someone spiked a drink. Find the guy, he went towards the pier.', 'He\'s been barred everywhere. Come to the club, free drinks.'], 350],
  ['Arjun', 'Gupta', 0, 'student', 'Student who built an app that might be worth millions.', ['I need a laptop charger from the mall. Emergency.', 'An investor wants to meet at the office tower. Come with me?', 'He bought it! I\'m rich! Party at the club!'], 2000],
  ['Penny', 'Hall', 1, 'retired', 'Grandmother who used to be a getaway driver.', ['My grandson borrowed my car and never brought it back. It\'s by the burger place.', 'Take me to the casino. I feel lucky.', 'I won! Here\'s your cut, dear. Meet me at the chapel.'], 800],
  ['Ivan', 'Petrov', 0, 'dockhand', 'Ex-boxer working the docks.', ['Someone\'s stealing from the containers. Check the pier tonight?', 'It was kids. Hungry kids. Bring food from the burger place?', 'I\'m coaching them now. Come to the gym, see the new team.'], 500],
  ['Zara', 'Khan', 1, 'officer', 'Rookie cop who still believes in the job.', ['A dealer\'s been selling near the college. Keep your eyes open there?', 'I need someone the dealers trust to pass a message at the bar.', 'I made detective! Come to the station, I\'ll give you a tour. Behave.'], 700],
  ['Leo', 'Santos', 0, 'dj', 'DJ who lost his records.', ['My record bag got nicked at the beach. Look around?', 'Someone\'s selling them at the mall! Go check.', 'Got them back. Come to the club, my set is dedicated to you.'], 400],
  ['Bianca', 'Romano', 1, 'sales', 'Saleswoman who sold a car to the wrong family.', ['The Kings want a refund. Bring this envelope to the Anchor Bar?', 'They want the car serviced too. Take it to Bay Customs.', 'They\'re happy. I\'m alive. Lunch at the diner, my treat.'], 900],
  ['Gabe', 'Torres', 0, 'priest', 'Father Gabe. Marries people. Hears confessions.', ['A couple want to elope at the chapel tonight. Can you be the witness?', 'The groom ran off! Last seen at the bar. Bring him back.', 'They\'re married. Come to the chapel, cake for everyone.'], 300],
  ['Mo', 'Ali', 1, 'burger', 'Burger joint manager with a secret recipe.', ['A rival chef wants my sauce recipe. Is he hanging around the diner?', 'Deliver a sample to the food critic at the office tower.', 'Five stars! Free burgers forever. Come by.'], 300],
  ['Silas', 'Wright', 0, 'artist', 'Photographer chasing the perfect shot of the bay.', ['I need a model at the pier at sunset. You?', 'The photo got stolen online. The thief works at the mall.', 'They\'re putting it in a gallery! Come to the opening at the college.'], 400],
  ['Amara', 'Nwosu', 1, 'nurse', 'Paramedic who saved half the city.', ['We need a volunteer for a first aid demo at the college.', 'Ambulance is broken. Get a part from Bay Motors?', 'I got an award! Ceremony at the chapel. Come?'], 300],
  ['Wade', 'Hayes', 0, 'cabbie', 'Night cabbie who knows every dodgy address.', ['A fare left a phone in my cab. It keeps ringing. Return it at the bar?', 'The owner wants to thank you. He\'s at the casino.', 'He\'s offered me a job as his driver. Meet me at the pier, I need advice.'], 600],
  ['Lina', 'Lin', 1, 'stylist', 'Hairdresser who hears every secret in town.', ['Mrs Bell told me her husband\'s cheating. He\'s at the bar. Find out?', 'Tell Mrs Bell. Gently. She\'s at the diner.', 'They\'re in therapy. I\'m a hero. Free cut, come by.'], 250],
  ['Rory', 'Kelly', 0, 'musician', 'Drummer whose band needs a van.', ['There\'s a van for sale at Bay Motors. Check it out for us?', 'We need a gig. Ask the club manager?', 'We\'re playing Saturday! Come to the club.'], 350],
  ['Greta', 'Weber', 1, 'analyst', 'Accountant with a gambling twin.', ['My twin is at the casino again. Drag her out?', 'She owes money at the bar. Pay it off with this?', 'She\'s in recovery. Dinner at the diner, both of us.'], 500],
  ['Emeka', 'Balogun', 0, 'teacher', 'PE teacher coaching the worst football team in Bay City.', ['We need new balls from the mall. Literally.', 'The ref is bent. He drinks at the bar. Have a word.', 'We won a game! First time in five years! Come to the park.'], 250],
  ['Coco', 'Moreau', 1, 'influencer', 'Fashion blogger with a stalker.', ['Someone keeps following me. He hangs out by the mall. Find out who?', 'Take this to the police station. It\'s everything I\'ve got on him.', 'They arrested him. I can breathe. Coffee at the diner?'], 600],
  ['Victor', 'Ivanova', 0, 'dealer', 'Casino pit boss with too many enemies.', ['Someone\'s skimming chips. Watch the cashier at the casino.', 'It\'s my brother-in-law. Tell my sister at the diner. I can\'t.', 'Family meeting went well. Mostly. Come by the casino.'], 1000],
  ['Joy', 'Mendoza', 1, 'cashier', 'Supermarket worker raising three kids alone.', ['My car broke down. Get my kids from the college?', 'My ex hasn\'t paid support in months. He works at Bay Motors.', 'He paid! Kids got new shoes. Come to QuickMart, I\'ll do you a deal.'], 300],
  ['Hassan', 'Farouk', 0, 'dockhand', 'Union rep at the docks.', ['The bosses are cutting wages. Hand out flyers by the pier?', 'Someone\'s threatening the workers. He drinks at the bar.', 'We got the raise! Union party at the pier.'], 450],
  ['Ivy', 'Green', 1, 'farmer', 'Grows the best tomatoes in the county.', ['A restaurant wants my tomatoes. Deliver a crate to the diner?', 'Someone\'s stealing veg at night. Watch the farm road by Eastport.', 'Won Best in Show! Come to the market, free veg.'], 300],
  ['Kieran', 'Evans', 0, 'shelf', 'QuickMart worker who knows the night shift is haunted.', ['Something moves in the stockroom at night. Check it out?', 'It was a raccoon. A huge one. Take it to the park?', 'The raccoon\'s our mascot now. Come see him at QuickMart.'], 200],
  ['Farah', 'Rahman', 1, 'lawyer', 'Public defender, never loses.', ['My client\'s alibi is a bartender at the Anchor. Get him to testify?', 'The prosecutor\'s witness is lying. He\'s at the casino.', 'Not guilty! Drinks at the bar.'], 900],
  ['Nico', 'Conti', 0, 'shopgirl', 'Mall clothes shop assistant who designs his own line.', ['I need fabric from the laundrette\'s lost and found. Seriously.', 'A buyer from out of town is at the office tower. Show him my samples?', 'He ordered 500! Come to the mall, first piece is yours.'], 500],
  ['Skye', 'Bennett', 1, 'courier', 'Courier saving for flying lessons.', ['A package needs to get to the airport hangar fast.', 'The pilot needs a part from Bay Motors before takeoff.', 'I got my first lesson! Come to the hangar and watch.'], 400],
  ['Bruno', 'Silva', 0, 'cook', 'Chef who got fired for being too honest about the food.', ['I\'m opening a pop-up. Get supplies from QuickMart?', 'The health inspector is coming. Distract him at the diner?', 'Full house every night. Come eat at the diner.'], 500],
  ['Lola', 'Reyes', 1, 'dj', 'Radio host on Bay FM.', ['A caller says he saw a robbery at the casino. Find him at the bar?', 'The robber is listening to my show. Leave a message at the station.', 'Caught! My ratings are through the roof. Come to the studio.'], 600],
];

let REG = null;
export function citizens(places, cities) {
  if (REG) return REG;
  const r = rng(424242), pk = a => a[Math.floor(r() * a.length)], used = new Set(), list = [];
  const at = interior => places.filter(p => p.interior === interior);
  const homeSpot = () => { const c = cities[Math.floor(r() * cities.length)]; const ix = c.kx[0] + Math.floor(r() * (c.kx[1] - c.kx[0])), iz = c.kz[0] + Math.floor(r() * (c.kz[1] - c.kz[0])); return { x: c.cx + (ix + 0.5) * 48 + (r() - 0.5) * 30, z: c.cz + (iz + 0.5) * 48 + (r() - 0.5) * 30 }; };
  const anchorFor = where => { const ps = at(where); if (ps.length) { const p = ps[Math.floor(r() * ps.length)]; return { x: p.x, z: p.z, place: p.id }; } if (where === 'beach') return { x: 60 + r() * 120, z: 380 }; if (where === 'park') return { x: -100 + r() * 30, z: -190 + r() * 30 }; return null; };
  const add = (first, last, fem, jobKey, story) => {
    const name = `${first} ${last}`; if (used.has(name)) return null; used.add(name);
    const job = CIT_JOBS.find(j => j[0] === jobKey) || pk(CIT_JOBS), home = homeSpot();
    const work = job[2] ? anchorFor(job[2]) : homeSpot(), eve = pk(EVENINGS), leisure = eve === 'home' ? home : anchorFor(eve) || home;
    const c = { cid: list.length, name, first, fem: !!fem, job: job[0], says: job[1], home, work: work || home, leisure, eve, start: 6 + Math.floor(r() * 5), len: 7 + Math.floor(r() * 4), owl: r() < 0.2,
      att: pk(['straight', 'straight', 'normal', 'normal', 'normal', 'edgy', 'edgy']), seed: Math.floor(r() * 1e9), age: pk(['young', 'young', 'adult', 'adult', 'adult', 'older']), rel: [] };
    if (story) c.story = { bio: story[4], asks: story[5], reward: story[6] };
    list.push(c); return c;
  };
  for (const s of STORY) add(s[0], s[1], s[2], s[3], s);
  let guard = 0;
  while (list.length < 1000 && guard++ < 20000) { const fem = r() < 0.5; add(pk(fem ? FF : FM), pk(LN), fem, pk(CIT_JOBS)[0]); }
  // who knows who: couples, best friends and siblings (siblings share a surname)
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (a.rel.length) continue;
    const roll = r();
    if (roll < 0.28) { const b = list[Math.floor(r() * list.length)]; if (b !== a && !b.rel.length) { a.rel.push({ cid: b.cid, k: 'partner' }); b.rel.push({ cid: a.cid, k: 'partner' }); b.home = a.home; } }
    else if (roll < 0.55) { const b = list[Math.floor(r() * list.length)]; if (b !== a) { a.rel.push({ cid: b.cid, k: 'friend' }); b.rel.push({ cid: a.cid, k: 'friend' }); } }
    else if (roll < 0.62) { const b = list.find((q, j) => j > i && q.name.split(' ')[1] === a.name.split(' ')[1] && !q.rel.some(x => x.k === 'sibling')); if (b) { a.rel.push({ cid: b.cid, k: 'sibling' }); b.rel.push({ cid: a.cid, k: 'sibling' }); } }
  }
  REG = list; return REG;
}
// where someone is at this hour: asleep at home, at work, out for the evening, or heading between
export function whereNow(c, hour, day = 0) {
  const weekend = day % 7 >= 5, end = c.start + c.len;
  if (!weekend && hour >= c.start && hour < end) return c.work;
  if (hour >= end && hour < (c.owl ? 26 : 22) || (c.owl && hour < 2)) return c.leisure;
  if (weekend && hour >= 11 && hour < 22) return c.leisure;
  return c.home;
}
// a look for them, the same every time (seeded)
export function citizenCfg(c, randomChar, opts) {
  const save = Math.random; let s = c.seed % 2147483646 + 1; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  try { return opts(c, randomChar()); } finally { Math.random = save; }
}
