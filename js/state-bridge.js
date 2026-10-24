window.ArohaStateBridge = {
    subscribers: [],
    publish(event, data) {
        this.subscribers.forEach(sub => { if(sub.event === event) sub.callback(data); });
    },
    subscribe(event, callback) {
        this.subscribers.push({ event, callback });
    }
};
