// Messages that we'll send to the client

// Representing a person's position
export type Position = {
	lat: number;
	lng: number;
	id: string;
	isRobot: boolean;
	country: string;
	region: string;
};

export type OutgoingMessage =
	| {
			type: "add-marker";
			position: Position;
	  }
	| {
			type: "remove-marker";
			id: string;
	  }
	| {
			type: "counts";
			people: number;
			robots: number;
	  };
