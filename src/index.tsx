/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Component, createRef, PureComponent } from 'react'
import { createPortal, flushSync } from 'react-dom'
import {
    CalendarOptions,
    CalendarApi,
    Calendar,
} from '@fullcalendar/core'
import {
    CustomRendering,
    CustomRenderingStore,
} from '@fullcalendar/core/internal'

const reactMajorVersion = parseInt(String(React.version).split('.')[0])
const syncRenderingByDefault = reactMajorVersion < 18


interface CalendarState {
    customRenderingMap: Map<string, CustomRendering<any>>
}

const ANIMATE_TIME = 500;

function swipe(element: HTMLElement, direction: 'left-to-main' | 'right-to-main' | 'main-to-left' | 'main-to-right', isShadow: boolean) {
    let start = 'translateX(0)';
    let end = 'translateX(0)';
    switch (direction) {
        case 'left-to-main':
            start = 'translateX(-100%)';
            break;
        case 'right-to-main':
            start = 'translateX(100%)';
            break;
        case 'main-to-left':
            end = 'translateX(-100%)';
            break;
        case 'main-to-right':
            end = 'translateX(100%)';
            break;
    }
    if (isShadow) {
        start += ' translateY(-100%)';
        end += ' translateY(-100%)';
    }
    disableScroll();
    element.style.transform = start;
    element.style.opacity = direction.startsWith('main-to') ? '1' : '0';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            element.style.transition = `all ${ANIMATE_TIME}ms`;
            element.style.transform = end;
            element.style.opacity = direction.startsWith('main-to') ? '0' : '1';
            enableScroll();
        });
    });
}

function disableScroll() {
    document.body.style.overflow = 'hidden';
}

function enableScroll() {
    document.body.style.overflow = '';
}


class CalendarAnimation {
    prevState: { el: HTMLElement; };
    endDirection : string
    constructor() {
        this.prevState = {
            el: document.createElement('div') as HTMLElement
        }
        this.endDirection = ''
    }

    animate(parentEle: HTMLElement, direction: string) {
        if (!parentEle) return;
        let observer: MutationObserver | null = null;
        const tableWrapper = parentEle.querySelector('.fc-view') as HTMLElement; // Move tableWrapper outside to avoid duplicate querySelector calls
    
        const observeTable = () => {
            const table = parentEle.querySelector('.fc-view table') as HTMLElement;
            if (table && observer) { // Check if observer is not null before disconnecting
                observer.disconnect();
                this.performAnimation(table, tableWrapper, this.endDirection.length ? this.endDirection : direction);
            }
        };
    
        const listEmpty = parentEle.querySelector('.fc-list-empty') as HTMLElement;
        const table = parentEle.querySelector('.fc-view table') as HTMLElement;
    
        if (listEmpty || !table) { // Combine conditions to avoid duplicate code
            this.performAnimation(listEmpty || table, tableWrapper, direction);
            observer = new MutationObserver(observeTable);
            observer.observe(parentEle, { childList: true, subtree: true });
        } else {
            this.performAnimation(table, tableWrapper, direction);
            this.endDirection = direction
        }
    }
    
    performAnimation(table: HTMLElement, tableWrapper: HTMLElement, direction: string ) {
        const shadowTable = this.prevState.el;
        shadowTable.classList.add('shadow-table');
    
        tableWrapper.appendChild(shadowTable);
        const clonedTable = table.cloneNode(true) as HTMLElement;
    
        this.prevState.el = clonedTable;
    
        table.style.backgroundColor = 'white';
        table.style.transition = '';
    
        shadowTable.style.backgroundColor = 'white';
        tableWrapper.style.overflow = 'hidden';
    
        const swipeDirection = direction === 'next' ? 'right-to-main' : 'left-to-main';
        const shadowSwipeDirection = direction === 'next' ? 'main-to-left' : 'main-to-right';
    
        swipe(table, swipeDirection, false);
        swipe(shadowTable, shadowSwipeDirection, true);
    
        setTimeout(() => {
            table.style.backgroundColor = '';
            table.style.transform = '';
            tableWrapper.style.overflow = '';    
        }, ANIMATE_TIME);
    
        shadowTable.remove();
    }
}

export default class FullCalendar extends Component<CalendarOptions, CalendarState> {
    static act = runNow // DEPRECATED. Not leveraged anymore
	// handlers = useSwipeable({
	// 	onSwipedLeft: async () => {
	// 		this.calendar.next();
	// 		this.animateCalendar.animate(this.elRef.current as HTMLElement, 'next');
	// 	},
	// 	onSwipedRight: async () => {
	// 		this.calendar.prev()
	// 		this.animateCalendar.animate(this.elRef.current as HTMLElement, 'prev');
	// 	},
	// });
	private animateCalendar = new CalendarAnimation();
    private elRef = createRef<HTMLDivElement>()
    private calendar: Calendar
    private handleCustomRendering: (customRendering: CustomRendering<any>) => void
    private resizeId: number | undefined
    private isUpdating = false
    private isUnmounting = false

    state: CalendarState = {
        customRenderingMap: new Map<string, CustomRendering<any>>()
    }
    

    render() {

        const customRenderingNodes: JSX.Element[] = []


        for (const customRendering of this.state.customRenderingMap.values()) {
            customRenderingNodes.push(
                <CustomRenderingComponent
                    key={customRendering.id}
                    customRendering={customRendering}
                />
            )
        }

        return (
			<div style={{height: '100dvh'}}>
            <div ref={this.elRef}>
                {customRenderingNodes}
            </div>
			</div>
        )
    }

    componentDidMount() {
		console.log('Coooooo')
        const customRenderingStore = new CustomRenderingStore<unknown>()
        this.handleCustomRendering = customRenderingStore.handle.bind(customRenderingStore)

        this.calendar = new Calendar(this.elRef.current, {
            ...this.props,
            handleCustomRendering: this.handleCustomRendering,
            customButtons: {
                customPrev: {
                    click: () => {
						console.log('Prev button clicked');
                        this.calendar.prev();
                        this.animateCalendar.animate(this.elRef.current as HTMLElement, 'prev');
                    },
                },
                customNext: {
                    click: () => {
						console.log('Next button clicked');
                        this.calendar.next();
                        this.animateCalendar.animate(this.elRef.current as HTMLElement, 'next');
                    },
                },
            },
        })
        this.calendar.render()

        let lastRequestTimestamp: number | undefined

        customRenderingStore.subscribe((customRenderingMap) => {
            const requestTimestamp = Date.now()
            const isMounting = !lastRequestTimestamp
            const runFunc = (
                // don't call flushSync if React version already does sync rendering by default
                // guards against fatal errors:
                // https://github.com/fullcalendar/fullcalendar/issues/7448
                syncRenderingByDefault ||
                //
                isMounting ||
                this.isUpdating ||
                this.isUnmounting ||
                (requestTimestamp - lastRequestTimestamp) < 100 // rerendering frequently
            ) ? runNow // either sync rendering (first-time or React 16/17) or async (React 18)
                : flushSync // guaranteed sync rendering

            runFunc(() => {
                this.setState({ customRenderingMap }, () => {
                    lastRequestTimestamp = requestTimestamp
                    if (isMounting) {
                        this.doResize()
                    } else {
                        this.requestResize()
                    }
                })
            })
        })
    }

    componentDidUpdate() {
        this.isUpdating = true
        this.calendar.resetOptions({
            ...this.props,
            handleCustomRendering: this.handleCustomRendering,
        })
        this.isUpdating = false
    }

    componentWillUnmount() {
        this.isUnmounting = true
        this.cancelResize()
        this.calendar.destroy()
    }

    requestResize = () => {
        if (!this.isUnmounting) {
            this.cancelResize()
            this.resizeId = requestAnimationFrame(() => {
                this.doResize()
            })
        }
    }

    doResize() {
        this.calendar.updateSize()
    }

    cancelResize() {
        if (this.resizeId !== undefined) {
            cancelAnimationFrame(this.resizeId)
            this.resizeId = undefined
        }
    }

    getApi(): CalendarApi {
        return this.calendar
    }
}

// Custom Rendering
// -------------------------------------------------------------------------------------------------

interface CustomRenderingComponentProps {
    customRendering: CustomRendering<any>
}

class CustomRenderingComponent extends PureComponent<CustomRenderingComponentProps> {
    render() {
        const { customRendering } = this.props
        const { generatorMeta } = customRendering
        const vnode = typeof generatorMeta === 'function' ?
            generatorMeta(customRendering.renderProps) :
            generatorMeta

        return createPortal(vnode, customRendering.containerEl)
    }
}

// Util
// -------------------------------------------------------------------------------------------------

function runNow(f: () => void): void {
    f()
}


