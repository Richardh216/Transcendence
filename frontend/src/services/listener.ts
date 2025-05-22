// Event Listener management
export interface Listener {
<<<<<<< HEAD
  element: EventTarget | null | undefined;
=======
  element: EventTarget | null;
>>>>>>> 38a3d95fb112396268e8502d5d25d8da53524bbd
  event: string;
  handler: EventListener;
}

export function addListener(l: Listener, target: Listener[]) {
	if (!l.element)
		return ;
	l.element.addEventListener(l.event, l.handler);
	target.push(l);
}

export function removeListener(l: Listener) {
	l.element?.removeEventListener(l.event, l.handler);
}

export function removeListeners(listeners: Listener[]) {
	listeners.forEach(removeListener);
	listeners.length = 0;
}
