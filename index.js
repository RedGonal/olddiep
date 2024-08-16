const express = require("express");
const app = express();
const serv = require("http").Server(app);

const fps = 20;

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));

serv.listen(2000);

let Socket_List = {};

function unit(x, y) {
    const mag = Math.sqrt(x * x + y * y);
    if (mag > 0) {
        return [x / mag, y / mag];
    } else {
        return [0, 0];
    }
}

function aabbCollision(b1, b2) {
    return (
        b1.x + b1.r > b2.x - b2.r &&
        b1.x - b1.r < b2.x + b2.r &&
        b1.y + b1.r > b2.y - b2.r &&
        b1.y - b1.r < b2.y + b2.r
    );
}

const Entity = () => {
    let self = {
        x: 250,
        y: 250,
        spdX: 0,
        spdY: 0,
        maxHealth: 10,
        health: 10,
        id: "",
    };

    self.update = () => {
        self.updatePosition();
    };

    self.updatePosition = () => {
        self.x += self.spdX;
        self.y += self.spdY;
    };

    return self;
};

const Turret = (x, y, sizeX, sizeY, angle, delay, turret_type) => {
    let self = {
        x: x,
        y: y,
        type: turret_type,
        sizeX: sizeX,
        sizeY: sizeY,
        angle: angle,
        reload: 1,
        shoot_time: 1,
        delay_time: 0,
        max_delay_time: delay,
        anim1: 0,
        anim2: 0,
    };

    return self;
};

const Bullets = (x, y, rad, speed, angle, id, color) => {
    let self = Entity();
    self.id = Math.random();
    self.playerID = id;
    self.color = color;
    self.x = x;
    self.y = y;
    self.rad = rad;
    self.spdX = Math.cos(angle) * speed;
    self.spdY = Math.sin(angle) * speed;
    self.live_time = 2;
    self.health = 1;
    self.maxHealth = 1;

    const super_update = self.update;
    self.update = () => {
        self.collide();
        super_update();

        self.live_time -= 1 / fps;
        if (self.live_time < 0) {
            delete Bullets.list[self.id];
        }
    };

    self.collide = () => {
        for (let i in Shape.list) {
            const shape = Shape.list[i];
            if (
                aabbCollision(
                    { x: shape.x, y: shape.y, r: shape.r },
                    { x: self.x, y: self.y, r: self.rad },
                )
            ) {
                const a = self.x - shape.x;
                const b = self.y - shape.y;
                const dist = Math.sqrt(a * a + b * b);
                if (dist < shape.r + self.rad) {
                    const look = unit(self.spdX, self.spdY);

                    shape.spdX += look[0] * 5;
                    shape.spdY += look[1] * 5;

                    shape.health -= 1;
                    shape.playerID = id;
                    delete Bullets.list[self.id];
                }
            }
        }

        for (let i in Player.list) {
            const player = Player.list[i];
            if (
                aabbCollision(
                    { x: player.x, y: player.y, r: player.r },
                    { x: self.x, y: self.y, r: self.rad },
                )
            ) {
                const a = self.x - player.x;
                const b = self.y - player.y;
                const dist = Math.sqrt(a * a + b * b);
                if (dist < player.r + self.rad) {
                    const pen_depth = (player.r + self.rad - dist) / 2;
                    const look = unit(a, b);
                    const penVec = [look[0] * pen_depth, look[1] * pen_depth];

                    self.x += penVec[0];
                    self.y += penVec[1];
                    self.spdX += penVec[0];
                    self.spdY += penVec[1];

                    player.x -= penVec[0];
                    player.y -= penVec[1];
                    player.spdX -= penVec[0];
                    player.spdY -= penVec[1];
                }
            }
        }
    };

    Bullets.list[self.id] = self;
    return self;
};

const Shape = (x, y, shape_type) => {
    let self = Entity();
    self.x = x;
    self.y = y;
    self.playerID = null;
    self.angle = 0;
    self.damage_anim = 0;
    self.spin_dir = (Math.round(Math.random()) - 0.5) * 0.05;
    self.type = shape_type;
    self.id = Math.random();
    self.chase = false;

    switch (shape_type) {
        case 2:
            self.r = 30;
            self.health = 8;
            break;

        case 3:
            self.r = 50;
            self.health = 16;
            break;

        case 1:
            self.health = 4;
            self.r = 23;
            break;

        case 4:
            self.r = 15;
            self.health = 2;
            self.chase = true;
            break;

        case 5:
            self.r = 20;
            self.health = 4;
            self.chase = true;
            break;

        default:
            self.r = 25;
            self.health = 2;
            break;
    }

    self.maxHealth = self.health;

    let oldHealth = self.health;

    const super_update = self.update;
    self.update = () => {
        self.damage_anim = 0;
        if (self.health != oldHealth) {
            if (self.health < oldHealth) {
                self.damage_anim = 1;
            }

            oldHealth = self.health;
        }

        if (self.health < 1) {
            if (self.playerID != null && Player.list[self.playerID] != null)
                Player.list[self.playerID].points += self.maxHealth;

            delete Shape.list[self.id];
            return;
        }

        self.updateSpd();
        self.collide();
        super_update();
    };

    self.collide = () => {
        for (let i in Shape.list) {
            const shape = Shape.list[i];
            if (shape.id == self.id) continue;
            if (
                aabbCollision(
                    { x: shape.x, y: shape.y, r: shape.r },
                    { x: self.x, y: self.y, r: self.r },
                )
            ) {
                const a = self.x - shape.x;
                const b = self.y - shape.y;
                const dist = Math.sqrt(a * a + b * b);
                if (dist < shape.r + self.r) {
                    const pen_depth = (shape.r + self.r - dist) / 2;
                    const look = unit(a, b);
                    const penVec = [look[0] * pen_depth, look[1] * pen_depth];

                    self.x += penVec[0];
                    self.y += penVec[1];
                    self.spdX += penVec[0];
                    self.spdY += penVec[1];

                    shape.x -= penVec[0];
                    shape.y -= penVec[1];
                    shape.spdX -= penVec[0];
                    shape.spdY -= penVec[1];
                }
            }
        }
    };

    self.updateSpd = () => {
        if (self.chase == false) {
            self.spdX += Math.cos(self.angle / 2.5) * 0.2;
            self.spdY += Math.sin(self.angle / 2.5) * 0.2;
            self.angle += self.spin_dir;
        } else {
            let smallestDist = 500;
            const nearestPlayer = { x: 0, y: 0 };
            for (let i in Player.list) {
                const player = Player.list[i];
                const a = self.x - player.x;
                const b = self.y - player.y;
                const dist = Math.sqrt(a * a + b * b);
                if (dist < smallestDist) {
                    smallestDist = dist;
                    nearestPlayer.x = player.x;
                    nearestPlayer.y = player.y;
                }
            }

            if (smallestDist < 500) {
                const look = Math.atan2(
                    nearestPlayer.y - self.y,
                    nearestPlayer.x - self.x,
                );
                self.angle = look;
                self.spdX += Math.cos(self.angle) * 1.5;
                self.spdY += Math.sin(self.angle) * 1.5;
            } else {
                self.angle += self.spin_dir;
            }
        }

        self.spdX *= 0.8;
        self.spdY *= 0.8;
    };

    Shape.list[self.id] = self;
    return self;
};

const Player = (id, socket) => {
    let self = Entity();
    self.id = id;
    self.name = "";
    self.angle = 0;
    self.maxSpd = 15;
    self.friction = 0.15;
    self.r = 20;
    self.points = 0;
    self.maxPoints = 20;
    self.level = 1;
    self.forceField = true;
    self.turrets = [Turret(0, 0, 28, 60, 0, 0, 0)];
    //self.turrets = [Turret(-15, 0, 28, 60, 0, 0, 0), Turret(15, 0, 28, 60, 0, 0.25, 0)];
    self.shooting = false;
    self.mk = [false, false, false, false];

    self.turrets[0].reload = 0.75;

    const super_update = self.update;
    self.update = () => {
        if (self.forceField == true) self.health = self.maxHealth;

        if (self.health < 1) {
            delete Player.list[self.id];
            socket.emit("dead");
            return;
        }

        if (self.health < self.maxHealth) {
            self.health += 0.02;
            if (self.health > self.maxHealth) {
                self.health = self.maxHealth;
            }
        }

        self.r = self.level * 0.5 + 20;

        if (self.points > self.maxPoints) {
            const change = self.points - self.maxPoints;
            self.maxPoints *= 1.25;
            self.points = 0;
            self.points += change;
            self.level += 1;
        }

        self.updateSpd();
        self.updateTurrets();
        self.collide();
        super_update();
    };

    self.collide = () => {
        for (let i in Shape.list) {
            const shape = Shape.list[i];
            if (
                aabbCollision(
                    { x: shape.x, y: shape.y, r: shape.r },
                    { x: self.x, y: self.y, r: self.r },
                )
            ) {
                const a = self.x - shape.x;
                const b = self.y - shape.y;
                const dist = Math.sqrt(a * a + b * b);
                if (dist < shape.r + self.r) {
                    const pen_depth = (shape.r + self.r - dist) / 2;
                    const look = unit(a, b);
                    const penVec = [look[0] * pen_depth, look[1] * pen_depth];

                    if (self.forceField == false) {
                        self.health -= 0.5;
                        shape.health -= 0.25;
                    }

                    self.x += penVec[0];
                    self.y += penVec[1];
                    self.spdX += penVec[0];
                    self.spdY += penVec[1];

                    shape.x -= penVec[0];
                    shape.y -= penVec[1];
                    shape.spdX -= penVec[0];
                    shape.spdY -= penVec[1];
                }
            }
        }

        for (let i in Player.list) {
            const other = Player.list[i];

            if (other.id == self.id) continue;
            if (
                aabbCollision(
                    { x: other.x, y: other.y, r: other.r },
                    { x: self.x, y: self.y, r: self.r },
                ) == false
            )
                continue;

            const a = self.x - other.x;
            const b = self.y - other.y;
            const dist = Math.sqrt(a * a + b * b);
            if (dist < other.r + self.r) {
                const pen_depth = (other.r + self.r - dist) / 2;
                const look = unit(a, b);
                const penVec = [look[0] * pen_depth, look[1] * pen_depth];

                self.x += penVec[0];
                self.y += penVec[1];
                self.spdX += penVec[0];
                self.spdY += penVec[1];

                other.x -= penVec[0];
                other.y -= penVec[1];
                other.spdX -= penVec[0];
                other.spdY -= penVec[1];
            }
        }
    };

    self.updateTurrets = () => {
        self.turrets.forEach((turret) => {
            turret.shoot_time += 1 / fps;
            turret.anim1 += turret.anim2;
            if (turret.anim1 < -3) turret.anim2 = 3;
            if (turret.anim1 > 0) {
                turret.anim1 = 0;
                turret.anim2 = 0;
            }

            const playerScale = self.r / 30;
            let shooting = self.shooting;
            if (turret.type == 1) {
                const closestShape = { x: 0, y: 0 };

                let smallestDist = 400;
                for (let i in Player.list) {
                    const other = Player.list[i];
                    if (other == self) continue;
                    const a = other.x - self.x;
                    const b = other.y - self.y;
                    const dist = Math.sqrt(a * a + b * b);
                    if (dist < smallestDist) {
                        smallestDist = dist;
                        closestShape.x = other.x;
                        closestShape.y = other.y;
                    }
                }

                for (let i in Shape.list) {
                    const shape = Shape.list[i];
                    const a = shape.x - self.x;
                    const b = shape.y - self.y;
                    const dist = Math.sqrt(a * a + b * b);
                    if (dist < smallestDist) {
                        smallestDist = dist;
                        closestShape.x = shape.x;
                        closestShape.y = shape.y;
                    }
                }

                if (smallestDist < 400) {
                    turret.angle = Math.atan2(
                        closestShape.y - self.y,
                        closestShape.x - self.x,
                    );
                    shooting = true;
                } else {
                    turret.angle += 0.1;
                    shooting = false;
                }
            }

            if (turret.shoot_time > turret.reload) {
                if (shooting) {
                    if (turret.delay_time > turret.max_delay_time) {
                        turret.anim1 = 0;
                        turret.anim2 = -3;

                        if (turret.type == 0) {
                            const turretAngle = (turret.angle * Math.PI) / 180;
                            const total_angle = self.angle + turretAngle;
                            const offset = {
                                x:
                                    Math.cos(total_angle + Math.PI / 2) *
                                        turret.x +
                                    Math.cos(total_angle) *
                                        (turret.sizeY + turret.y),
                                y:
                                    Math.sin(total_angle + Math.PI / 2) *
                                        turret.x +
                                    Math.sin(total_angle) *
                                        (turret.sizeY + turret.y),
                            };

                            Bullets.shoot_bullet(
                                self.x + offset.x * playerScale,
                                self.y + offset.y * playerScale,
                                (turret.sizeX / 2) * playerScale,
                                12.5,
                                total_angle,
                                id,
                            );

                            self.spdX -=
                                Math.cos(total_angle) * (turret.sizeX / 10);
                            self.spdY -=
                                Math.sin(total_angle) * (turret.sizeX / 10);
                        } else if (turret.type == 1) {
                            const offset = {
                                x:
                                    Math.cos(turret.angle + Math.PI / 2) *
                                        turret.x +
                                    Math.cos(turret.angle) *
                                        (turret.sizeY + turret.y),
                                y:
                                    Math.sin(turret.angle + Math.PI / 2) *
                                        turret.x +
                                    Math.sin(turret.angle) *
                                        (turret.sizeY + turret.y),
                            };

                            Bullets.shoot_bullet(
                                self.x + offset.x * playerScale,
                                self.y + offset.y * playerScale,
                                (turret.sizeX / 2) * playerScale,
                                12.5,
                                turret.angle,
                                id,
                            );
                        }

                        turret.shoot_time = 0;
                    } else {
                        turret.delay_time += 1 / fps;
                    }
                } else {
                    turret.shoot_time = turret.reload;
                    turret.delay_time = 0;
                }
            }
        });
    };

    self.updateSpd = () => {
        let moveDir = [0, 0];

        if (self.mk[0]) moveDir[0] -= 1;
        if (self.mk[1]) moveDir[0] += 1;
        if (self.mk[2]) moveDir[1] -= 1;
        if (self.mk[3]) moveDir[1] += 1;
        if (moveDir[0] != 0 && moveDir[1] != 0)
            moveDir = unit(moveDir[0], moveDir[1]);

        self.spdX += moveDir[0] * self.maxSpd * self.friction;
        self.spdY += moveDir[1] * self.maxSpd * self.friction;

        self.spdX *= 1 - self.friction;
        self.spdY *= 1 - self.friction;
    };

    Player.list[self.id] = self;
    return self;
};

Player.list = {};
Player.onConnect = (socket) => {
    let player = null;

    socket.on("enableShoot", (en) => {
        if (player == null || player.forceField == true) return;
        player.shooting = en;
    });

    socket.on("moveKey", (kv, ki) => {
        if (player == null) return;

        player.mk[ki] = kv;
        player.forceField = false;
    });

    socket.on("updateStuff", (data) => {
        if (player == null) return;

        player.angle = data.angle;
    });

    socket.on("playGame", (name) => {
        if (Player.list[socket.id]) return;

        player = Player(socket.id, socket);
        player.name = name;

        socket.emit("playSignal");
    });
};

Player.onDisconnect = (socket) => {
    if (Player.list[socket.id] == null) return;
    delete Player.list[socket.id];
};

Player.update = () => {
    let pack = {};
    for (let i in Player.list) {
        const player = Player.list[i];

        player.update();

        pack[i] = {
            x: player.x,
            y: player.y,
            angle: player.angle,
            name: player.name,
            id: player.id,
            r: player.r,
            turrets: player.turrets,
            points: player.points,
            maxPoints: player.maxPoints,
            level: player.level,
            health: player.health,
            maxHealth: player.maxHealth,
            forceField: player.forceField,
        };
    }

    return pack;
};

Bullets.list = {};
Bullets.shoot_bullet = (x, y, rad, speed, angle, id) => {
    let bullet = Bullets(x, y, rad, speed, angle, id);
};

Bullets.update = () => {
    let pack = {};
    for (let i in Bullets.list) {
        const bullet = Bullets.list[i];
        bullet.update();

        pack[i] = {
            x: bullet.x,
            y: bullet.y,
            rad: bullet.rad,
            id: bullet.playerID,
        };
    }

    return pack;
};

Shape.list = {};
Shape.update = () => {
    let pack = {};
    for (let i in Shape.list) {
        const shape = Shape.list[i];
        shape.update();

        pack[i] = {
            damage_anim: shape.damage_anim,
            x: shape.x,
            y: shape.y,
            r: shape.r,
            angle: shape.angle,
            type: shape.type,
            health: shape.health,
            maxHealth: shape.maxHealth,
        };
    }

    return pack;
};

Shape.addRandomShape = () => {
    const randomNum = Math.round(Math.random() * 11);
    let shape_type = 0;
    if (randomNum > 9) {
        shape_type = 5;
    } else if (randomNum > 7) {
        shape_type = 4;
    } else if (randomNum > 6) {
        shape_type = 3;
    } else if (randomNum > 4) {
        shape_type = 2;
    } else if (randomNum > 1) {
        shape_type = 1;
    } else {
        shape_type = 0;
    }

    let shape = Shape(Math.random() * 1000, Math.random() * 1000, shape_type);
};

for (let i = 0; i < 30; i++) {
    Shape.addRandomShape();
}

const io = require("socket.io")(serv, {});
io.sockets.on("connection", (socket) => {
    Player.onConnect(socket);
    Socket_List[socket.id] = socket;

    socket.on("disconnect", () => {
        Player.onDisconnect(socket);
        delete Socket_List[socket.id];
    });
});

function shapeTimer() {
    let length = 0;
    for (let i in Shape.list) {
        length += 1;
    }

    if (length < 30) {
        Shape.addRandomShape();
    }

    setTimeout(shapeTimer, 1000);
}

shapeTimer();

setInterval(() => {
    let sPack = Shape.update();
    let bPack = Bullets.update();
    let pack = Player.update();

    for (let i in Socket_List) {
        if (Player.list[i] == null) continue;

        const player = Socket_List[i];
        player.emit("newPositions", pack, bPack, sPack);
        player.emit("updateStuff");
    }
}, 1000 / fps);
