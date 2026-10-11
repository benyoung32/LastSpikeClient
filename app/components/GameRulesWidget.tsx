"use client";

import React from 'react';
import { AnimatedModalWidget } from './AnimatedModalWidget';

const SECTION_HEADER_CLASS = "text-xl font-bold uppercase mb-2 text-[#5c4d3c] border-b border-[#5c4d3c]/20 pb-1";

export interface GameRulesWidgetProps {
    className?: string;
}

export const GameRulesWidget: React.FC<GameRulesWidgetProps> = ({ className = "" }) => {
    return (
        <AnimatedModalWidget
            className={className}
            triggerClassName="w-16 h-16 rounded-full bg-amber-700 hover:bg-amber-600 border-2 border-[#e6dcc0] shadow-lg flex items-center justify-center group hover:scale-110"
            baseModalClassName="bg-[#f4ebd0] border-4 border-[#5c4d3c] rounded-xl shadow-2xl"
            animatingModalClassName="bg-[#e6dcc0] border-2 border-[#5c4d3c] rounded-lg shadow-none"
            modalClassName="w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] text-[#3e3223] font-cute"
            hideDefaultCloseButton={true}
            triggerContent={
                <div title="Game Rules" className="w-full h-full flex items-center justify-center rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#e6dcc0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            }
            modalContent={(closeModal) => (
                <div className="flex flex-col h-full min-h-0">

                    {/* Header */}
                    <div className="p-6 border-b-2 border-[#5c4d3c]/20 bg-[#e6dcc0] flex justify-between items-center shrink-0">
                        <h2 className="text-3xl font-bold tracking-widest uppercase">The Last Spike - Rules</h2>
                        <button
                            onClick={() => closeModal()}
                            className="text-[#8c7356] hover:text-[#5c4d3c] transition-colors p-2 rounded-full hover:bg-black/5"
                            aria-label="Close rules"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrolling Body */}
                    <div className="p-6 sm:p-10 overflow-y-auto flex-1 min-h-0 space-y-6 text-lg leading-relaxed [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>GOAL</h3>
                            <p>
                                Players build the railway from Montreal to
                                Vancouver and speculate in land seeking to
                                make the most money before the <i>Last
                                    Spike</i> is laid.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>GAMEBOARD</h3>
                            <p>
                                The gameboard has two areas of play. The
                                outside path around which players move tokens
                                to the throw of dice; and, the center of the
                                gameboard where railway track is built to
                                connect the nine cities.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>RAILWAY TRACK</h3>
                            <p>
                                There are 12 routes connecting the cities and
                                four track sections fit into each route.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>DEEDS</h3>
                            <p>
                                There are five lands deeds for each of the nine cities.
                                Players buy, sell, and trade these deeds during
                                the game. Deeds are drawn randomly from a deck containing all 45 deeds.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>BUYING PROPERTY</h3>
                            <p>
                                When a player lands on one of the six blue
                                spaces marked "Land" they have the <i>option</i> to buy property.
                                If property is desired, pay the amount indicated in the space
                                and draw the top card from the deed deck. The
                                property which a player receives can not be
                                rejected for any reason.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>SELLING PROPERTY</h3>
                            <p>
                                Property can never be sold back to the bank. A
                                player may sell or trade one or more deeds to
                                any player for any agreed price or deal.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>BUILDING RAILWAY</h3>
                            <p>
                                When a player lands a Track space they
                                <i>must</i> build one railway track section in
                                the center area of the board. A track section
                                can not be moved once laid.
                                <br />
                                A player must build track. Should they not be
                                able to pay the amount necessary, they must sell
                                property to raise the money.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>LAND GRANTS</h3>
                            <p>
                                The first section of railway track built in each
                                of the 12 routes, entitles the builder to a
                                <i>free</i> land grant. A player must first
                                pay for and build the track section in a route
                                which contains no track. For example, the first
                                track section built in the Vancouver to Calgary
                                route, entitles the builder to a free land deed.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>PROPERTY INCOME</h3>
                            <p>
                                When all four track sections in any route have
                                been built every property owner of the two
                                cities connected by the finished route receives
                                money. The amount of money each player receives
                                is based on the number of deeds held of one or
                                both cities. The deeds have five increasing
                                payoffs. If a player held three deeds of one
                                city, they receive the amount indicated by the
                                number "3" on the deed.
                                <br /><br />
                                <i>
                                    Example: the four railway sections between
                                    Montreal and Toronto have been built. Every
                                    player who owned Montreal and/or Toronto
                                    deeds would now receive money. If a player
                                    owned three Montreal deeds they would
                                    receive $45,000. If they also owned two
                                    Toronto deeds, they would receive another
                                    $15,000 for a total of $60,000.
                                </i>
                                <br /><br />
                                <strong>Note: </strong>
                                Some cities have the potential to pay income
                                more times than other cities. Winnipeg has
                                four routes connecting to it and can
                                therefore earn income four times if all four
                                routes into Winnipeg are built. Saskatoon has just two routes
                                connecting to it and can therefore pay
                                income a maximum of two times. A city may not earn income
                                as many times as is possible before the game
                                ends. In fact, with the exception of
                                Vancouver and Montreal, both of which must
                                be connected at least once to end the game,
                                a city may never earn income for its
                                property owners.
                                <br /><br />
                                Sometimes a player may draw a deed for a city
                                which has already paid out its maximum revenue.
                                In this case, another deed may not be drawn.
                                That's life!
                            </p>
                        </section>

                        {/* <section>
                            <h3 className={SECTION_HEADER_CLASS}>CPR SUBSIDY</h3>
                            <p>
                                Collect $5000 when you land on the space - not
                                when you pass it.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>LAND CLAIMS</h3>
                            <p>
                                A player landing here must throw the dice again
                                and pay $1000 x the number thrown. If "8" was
                                thrown, pay $8000.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>ROADBED COSTS</h3>
                            <p>Pay $1000 for each deed you own.</p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>SETTLER RENTS</h3>
                            <p>Collect $1000 for each deed you own.</p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>SURVEY FEES</h3>
                            <p>Collect $3000 from each player in the game.</p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>SCANDAL</h3>
                            <p>Pay a 'bribe' of $10,000.</p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>NORTHWEST REBELLION</h3>
                            <p>
                                Remove one track section from any route
                                containing two or three built sections. A player
                                may not remove a track section from any route
                                containing one or four track sections. If this
                                forces them to remove a section of track from a
                                route they have a property interest in they must
                                do so.
                            </p>
                        </section>

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>NO MONEY?</h3>
                            <p>
                                Players may not borrow money from the bank or
                                from other players. If money is required, a
                                player must sell property either by private sale
                                or by auction to the highest bidder. A player
                                who can not raise sufficient money to pay a debt
                                is eliminated from the game.
                            </p>
                        </section> */}

                        <section>
                            <h3 className={SECTION_HEADER_CLASS}>THE LAST SPIKE</h3>
                            <p>
                                The game ends when the <i>Last Spike</i> is
                                laid. The <i>Last Spike</i> is the track section
                                which, when built, makes a continuous railway
                                from Vancouver to Montreal. A player is not
                                forced to lay the <i>Last Spike</i> if they can
                                play track elsewhere. The player who lays the
                                <i>Last Spike</i> receives a bonus of $20,000.
                                When the <i>Last Spike</i> is laid, the property
                                income for the two cities connected by the play
                                is paid.
                                <br /><br />
                                <strong>The player with the most money
                                    wins the game.</strong>
                            </p>
                        </section>

                    </div>
                </div>
            )}
        />
    );
};
