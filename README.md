
# FullCalendar React Component

The official [React](https://reactjs.org/) Component for [FullCalendar](https://fullcalendar.io)

## Installation

Install the React connector, the core package, and any plugins (like [daygrid](https://fullcalendar.io/docs/month-view)):

```sh
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid
```

## Usage

Render a `FullCalendar` component, passing-in [options](https://fullcalendar.io/docs#toc) as props:

```jsx
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'

const events = [
  { title: 'Meeting', start: new Date() }
]

export function DemoApp() {
  return (
    <div>
      <h1>Demo App</h1>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView='dayGridMonth'
        weekends={false}
        events={events}
        eventContent={renderEventContent}
      />
    </div>
  )
}

// a custom render function
function renderEventContent(eventInfo) {
  return (
    <>
      <b>{eventInfo.timeText}</b>
      <i>{eventInfo.event.title}</i>
    </>
  )
}
```

## Links

- [Documentation](https://fullcalendar.io/docs/react)
- [Example Project](https://github.com/fullcalendar/fullcalendar-example-projects/tree/master/react)
- [Contributor Guide](CONTRIBUTORS.md)
